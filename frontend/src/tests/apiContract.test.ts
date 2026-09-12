import { describe, expect, it } from 'vitest'
import type { HttpResult } from '../api/client'
import { unwrapResponse } from '../api/contract'
import { failureEnvelope, httpResult, successEnvelope } from './helpers'

async function read(result: HttpResult): Promise<unknown> {
  return unwrapResponse(result)
}

describe('API contract', () => {
  it('unwraps a successful response', async () => {
    await expect(read(httpResult(successEnvelope('ready')))).resolves.toBe('ready')
  })

  it('leaves domain validation to the service', async () => {
    await expect(read(httpResult(successEnvelope(123)))).resolves.toBe(123)
  })

  it('accepts null data in a successful envelope', async () => {
    await expect(read(httpResult(successEnvelope(null)))).resolves.toBeNull()
  })

  it('allows extra envelope fields', async () => {
    await expect(
      read(
        httpResult({
          ...successEnvelope([]),
          traceId: 'optional-field',
        }),
      ),
    ).resolves.toEqual([])
  })

  it.each([400, 404, 409, 500])('preserves HTTP %s and backend fields', async (status) => {
    const payload = failureEnvelope()
    await expect(read(httpResult(payload, status))).rejects.toMatchObject({
      kind: 'HTTP',
      status,
      code: payload.error.code,
      message: payload.error.message,
      details: payload.error.details,
    })
  })

  it('rejects a business failure with HTTP 200', async () => {
    const payload = failureEnvelope()
    await expect(read(httpResult(payload))).rejects.toMatchObject({
      kind: 'BUSINESS',
      status: 200,
      code: payload.error.code,
      message: payload.error.message,
      details: payload.error.details,
    })
  })

  it.each([
    { status: 200, kind: 'INVALID_RESPONSE' },
    { status: 502, kind: 'HTTP' },
  ])('handles non-JSON HTTP $status', async ({ status, kind }) => {
    await expect(
      read({
        status,
        ok: status >= 200 && status < 300,
        body: '<html>Unavailable</html>',
      }),
    ).rejects.toMatchObject({ kind, status, cause: expect.any(SyntaxError) })
  })

  it.each([
    null,
    [],
    'ready',
    {},
    { ...successEnvelope('ready'), success: 'true' },
    { success: true, data: 'ready', error: null },
    { success: true, error: null, timestamp: '2026-09-12T00:00:00Z' },
    { ...successEnvelope('ready'), error: {} },
    { ...successEnvelope('ready'), timestamp: null },
    { ...failureEnvelope(), data: 'unexpected' },
    { ...failureEnvelope(), error: { code: 'ERROR', message: 'Bad', details: { field: 123 } } },
    { ...failureEnvelope(), error: { code: 'ERROR', message: 'Bad', details: [] } },
    { ...failureEnvelope(), error: { code: 123, message: 'Bad', details: {} } },
    { ...failureEnvelope(), error: { code: 'ERROR', message: null, details: {} } },
  ])('rejects malformed envelopes %j', async (payload) => {
    await expect(read(httpResult(payload))).rejects.toMatchObject({
      kind: 'INVALID_RESPONSE',
      status: 200,
    })
  })

  it.each([
    { unexpected: true },
    successEnvelope('misleading success'),
    { ...failureEnvelope(), error: { code: 'ERROR', message: 'Bad', details: { field: 123 } } },
  ])('preserves HTTP status for an unusable error envelope %j', async (payload) => {
    await expect(read(httpResult(payload, 503))).rejects.toMatchObject({
      kind: 'HTTP',
      status: 503,
      code: 'HTTP',
      details: {},
    })
  })
})
