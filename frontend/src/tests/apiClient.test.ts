import { AxiosError } from 'axios'
import type { AxiosRequestConfig, CreateAxiosDefaults } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from './helpers'

const { getMock, createMock } = vi.hoisted(() => {
  const getMock =
    vi.fn<
      (path: string, options: AxiosRequestConfig) => Promise<{ status: number; data: unknown }>
    >()
  const createMock = vi.fn<(config: CreateAxiosDefaults) => { get: typeof getMock }>()
  return { getMock, createMock }
})

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return { ...actual, default: { ...actual.default, create: createMock } }
})

let get: typeof import('../api/client').get

beforeEach(async () => {
  vi.resetModules()
  vi.stubEnv('VITE_API_BASE_URL', API_BASE_URL)
  createMock.mockReturnValue({ get: getMock })
  getMock.mockRejectedValue(new Error('Unexpected Axios GET in test'))
  get = (await import('../api/client')).get
})

describe('HTTP transport', () => {
  it('does not initialize Axios when importing the module', () => {
    expect(createMock).not.toHaveBeenCalled()
  })

  it.each([API_BASE_URL, `  ${API_BASE_URL}/  `])(
    'normalizes the origin %s and returns raw text',
    async (baseUrl) => {
      vi.stubEnv('VITE_API_BASE_URL', baseUrl)
      getMock.mockResolvedValue({ status: 200, data: '{"ready":true}' })
      await expect(get('/api/v1/example')).resolves.toEqual({
        status: 200,
        ok: true,
        body: '{"ready":true}',
      })
      expect(createMock).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          baseURL: API_BASE_URL,
          adapter: 'xhr',
          timeout: 10_000,
          headers: { Accept: 'application/json' },
          responseType: 'text',
          transformResponse: [expect.any(Function)],
          validateStatus: expect.any(Function),
          transitional: { clarifyTimeoutError: true },
        }),
      )
      const config = createMock.mock.calls[0]?.[0]
      expect(config?.validateStatus?.(500)).toBe(true)
      expect(getMock).toHaveBeenCalledExactlyOnceWith('/api/v1/example', {
        timeout: 10_000,
        signal: undefined,
      })
    },
  )

  it('reuses the initialized instance and configuration', async () => {
    getMock.mockResolvedValue({ status: 200, data: '{}' })
    await get('/api/v1/first')
    vi.stubEnv('VITE_API_BASE_URL', '')
    await get('/api/v1/second')
    expect(createMock).toHaveBeenCalledOnce()
    expect(getMock).toHaveBeenCalledTimes(2)
  })

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
  ])('rejects invalid configuration %s', async (baseUrl) => {
    vi.stubEnv('VITE_API_BASE_URL', baseUrl)
    await expect(get('/api/v1/example')).rejects.toMatchObject({ kind: 'CONFIG' })
    expect(createMock).not.toHaveBeenCalled()
    expect(getMock).not.toHaveBeenCalled()
  })

  it.each(['api/v1/example', '//other.test/example'])('rejects invalid path %s', async (path) => {
    await expect(get(path)).rejects.toMatchObject({ kind: 'CONFIG' })
    expect(getMock).not.toHaveBeenCalled()
  })

  it.each([0, -1, NaN, Infinity])('rejects invalid timeout %s', async (timeoutMs) => {
    await expect(get('/api/v1/example', { timeoutMs })).rejects.toMatchObject({
      kind: 'CONFIG',
    })
    expect(getMock).not.toHaveBeenCalled()
  })

  it('forwards timeout and the original signal', async () => {
    const caller = new AbortController()
    getMock.mockResolvedValue({ status: 200, data: '{}' })
    await get('/api/v1/example', { timeoutMs: 25, signal: caller.signal })
    expect(getMock).toHaveBeenCalledExactlyOnceWith('/api/v1/example', {
      timeout: 25,
      signal: caller.signal,
    })
  })

  it('does not send an already cancelled request', async () => {
    const caller = new AbortController()
    caller.abort()
    await expect(get('/api/v1/example', { signal: caller.signal })).rejects.toMatchObject({
      kind: 'ABORTED',
    })
    expect(createMock).not.toHaveBeenCalled()
    expect(getMock).not.toHaveBeenCalled()
  })

  it.each([200, 201, 204, 400, 404, 409, 500, 502])(
    'returns HTTP %s for contract processing',
    async (status) => {
      getMock.mockResolvedValue({ status, data: '<body>raw text</body>' })
      await expect(get('/api/v1/example')).resolves.toEqual({
        status,
        ok: status >= 200 && status < 300,
        body: '<body>raw text</body>',
      })
    },
  )

  it.each([
    { code: 'ERR_CANCELED', kind: 'ABORTED' },
    { code: 'ETIMEDOUT', kind: 'TIMEOUT' },
    { code: 'ERR_NETWORK', kind: 'NETWORK' },
    { code: 'ECONNABORTED', kind: 'NETWORK' },
  ])('maps $code to $kind and preserves the cause', async ({ code, kind }) => {
    const cause = new AxiosError('Transport failure', code)
    getMock.mockRejectedValue(cause)
    await expect(get('/api/v1/example')).rejects.toMatchObject({
      name: 'ApiClientError',
      kind,
      code: kind,
      status: null,
      cause,
    })
  })

  it('uses the rejection cause rather than a later signal state', async () => {
    const caller = new AbortController()
    const cause = new AxiosError('Network failure', 'ERR_NETWORK')
    getMock.mockImplementation(async () => {
      caller.abort()
      throw cause
    })
    await expect(get('/api/v1/example', { signal: caller.signal })).rejects.toMatchObject({
      kind: 'NETWORK',
      cause,
    })
  })

  it('preserves an unexpected programming error', async () => {
    const bug = new TypeError('Unexpected implementation failure')
    getMock.mockRejectedValue(bug)
    await expect(get('/api/v1/example')).rejects.toBe(bug)
  })

  it('preserves an unrecognized Axios error', async () => {
    const bug = new AxiosError('Unexpected option', 'ERR_BAD_OPTION_VALUE')
    getMock.mockRejectedValue(bug)
    await expect(get('/api/v1/example')).rejects.toBe(bug)
  })

  it('does not label a broken text boundary as NETWORK', async () => {
    getMock.mockResolvedValue({ status: 200, data: { unexpectedlyParsed: true } })
    await expect(get('/api/v1/example')).rejects.toBeInstanceOf(TypeError)
  })
})
