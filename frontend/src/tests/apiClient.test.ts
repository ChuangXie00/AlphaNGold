import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError, apiGet } from '../services/apiClient'
import {
  API_BASE_URL,
  failureEnvelope,
  jsonResponse,
  pendingUntilAbort,
  successEnvelope,
} from './helpers'

const fetchMock = vi.fn<typeof fetch>()
const isString = (value: unknown): value is string => typeof value === 'string'
const request = (options = {}) => apiGet('/api/v1/example', isString, options)

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', API_BASE_URL)
  vi.stubGlobal('fetch', fetchMock)
})

describe('apiGet', () => {
  it.each([API_BASE_URL, `  ${API_BASE_URL}/  `])(
    'unwraps data and builds the GET URL from %s',
    async (baseUrl) => {
      vi.stubEnv('VITE_API_BASE_URL', baseUrl)
      fetchMock.mockResolvedValue(jsonResponse(successEnvelope('ready')))

      await expect(request()).resolves.toBe('ready')
      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`${API_BASE_URL}/api/v1/example`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal),
      })
    },
  )

  it.each([
    undefined,
    '',
    '   ',
    'not-a-url',
    'ftp://api.test',
    `${API_BASE_URL}/api/v1`,
    `${API_BASE_URL}?key=value`,
    `${API_BASE_URL}#fragment`,
    'http://user:password@api.test',
  ])('rejects invalid configuration %s before fetching', async (baseUrl) => {
    vi.stubEnv('VITE_API_BASE_URL', baseUrl)
    await expect(request()).rejects.toMatchObject({ kind: 'CONFIG' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['api/v1/example', '//other.test/example'])(
    'rejects invalid path %s before fetching',
    async (path) => {
      await expect(apiGet(path, isString)).rejects.toMatchObject({ kind: 'CONFIG' })
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )

  it.each([0, -1, NaN, Infinity])('rejects invalid timeout %s', async (timeoutMs) => {
    await expect(request({ timeoutMs })).rejects.toMatchObject({ kind: 'CONFIG' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([400, 404, 500])('preserves HTTP %s and backend error details', async (status) => {
    const payload = failureEnvelope()
    fetchMock.mockResolvedValue(jsonResponse(payload, status))
    await expect(request()).rejects.toMatchObject({
      name: 'ApiClientError',
      kind: 'HTTP',
      status,
      code: payload.error.code,
      message: payload.error.message,
      details: payload.error.details,
    })
  })

  it('rejects a business failure even when HTTP is 200', async () => {
    const payload = failureEnvelope()
    fetchMock.mockResolvedValue(jsonResponse(payload))
    await expect(request()).rejects.toMatchObject({
      kind: 'BUSINESS',
      status: 200,
      code: payload.error.code,
      details: payload.error.details,
    })
  })

  it('normalizes a connection failure as NETWORK', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(request()).rejects.toMatchObject({ kind: 'NETWORK', status: null })
  })

  it.each([
    { status: 200, kind: 'INVALID_RESPONSE' },
    { status: 502, kind: 'HTTP' },
  ])('handles a non-JSON HTTP $status response', async ({ status, kind }) => {
    fetchMock.mockResolvedValue(new Response('<html>Unavailable</html>', { status }))
    await expect(request()).rejects.toMatchObject({ kind, status })
  })

  it.each([
    null,
    [],
    'ready',
    {},
    { ...successEnvelope('ready'), success: 'true' },
    { success: true, data: 'ready', error: null },
    { success: true, error: null, timestamp: '2026-09-10T08:00:00Z' },
    { ...successEnvelope('ready'), error: {} },
    { ...failureEnvelope(), data: 'unexpected' },
    { ...failureEnvelope(), error: { code: 'ERROR', message: 'Bad', details: { field: 123 } } },
  ])('rejects malformed envelopes: %j', async (payload) => {
    fetchMock.mockResolvedValue(jsonResponse(payload))
    await expect(request()).rejects.toMatchObject({ kind: 'INVALID_RESPONSE' })
  })

  it('checks the actual data rather than trusting the generic type', async () => {
    fetchMock.mockResolvedValue(jsonResponse(successEnvelope(123)))
    await expect(request()).rejects.toMatchObject({ kind: 'INVALID_RESPONSE' })
  })

  it('preserves HTTP status even if the error envelope is malformed', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ unexpected: true }, 503))
    await expect(request()).rejects.toMatchObject({ kind: 'HTTP', status: 503 })
  })

  it.each([undefined, 50])('cancels a stalled request at timeout %s', async (timeoutMs) => {
    vi.useFakeTimers()
    fetchMock.mockImplementation((_input, init) => pendingUntilAbort(init?.signal))
    const result = request({ timeoutMs })
    // Attach the rejection assertion before advancing time.
    const assertion = expect(result).rejects.toMatchObject({ kind: 'TIMEOUT' })
    const signal = fetchMock.mock.calls[0][1]?.signal
    const duration = timeoutMs ?? 10_000

    await vi.advanceTimersByTimeAsync(duration - 1)
    expect(signal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await assertion
    expect(signal?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancels an in-flight request when the caller aborts', async () => {
    vi.useFakeTimers()
    const caller = new AbortController()
    fetchMock.mockImplementation((_input, init) => pendingUntilAbort(init?.signal))
    const assertion = expect(request({ signal: caller.signal })).rejects.toMatchObject({
      kind: 'ABORTED',
    })
    caller.abort()
    await assertion
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not send a request for an already aborted signal', async () => {
    const caller = new AbortController()
    caller.abort()
    await expect(request({ signal: caller.signal })).rejects.toMatchObject({ kind: 'ABORTED' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['caller', 'timeout'])(
    'handles %s cancellation while reading the response body',
    async (cause) => {
      vi.useFakeTimers()
      const caller = new AbortController()
      const response = jsonResponse(successEnvelope('ready'))
      const readBody = vi.spyOn(response, 'json')
      fetchMock.mockImplementation((_input, init) => {
        readBody.mockImplementation(() => pendingUntilAbort(init?.signal))
        return Promise.resolve(response)
      })
      const assertion = expect(
        request({ signal: caller.signal, timeoutMs: 50 }),
      ).rejects.toMatchObject({
        kind: cause === 'caller' ? 'ABORTED' : 'TIMEOUT',
      })
      await vi.advanceTimersByTimeAsync(0)
      expect(readBody).toHaveBeenCalledOnce()
      if (cause === 'caller') caller.abort()
      else await vi.advanceTimersByTimeAsync(50)
      await assertion
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it.each([200, 500])('cleans timers and caller listeners after HTTP %s', async (status) => {
    vi.useFakeTimers()
    const caller = new AbortController()
    const addListener = vi.spyOn(caller.signal, 'addEventListener')
    const removeListener = vi.spyOn(caller.signal, 'removeEventListener')
    fetchMock.mockResolvedValue(
      jsonResponse(status === 200 ? successEnvelope('ready') : failureEnvelope(), status),
    )
    if (status === 200) await expect(request({ signal: caller.signal })).resolves.toBe('ready')
    else await expect(request({ signal: caller.signal })).rejects.toBeInstanceOf(ApiClientError)

    expect(vi.getTimerCount()).toBe(0)
    expect(removeListener).toHaveBeenCalledWith('abort', addListener.mock.calls[0][1])
    caller.abort()
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false)
  })
})
