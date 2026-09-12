import type { HttpResult } from './client'
import { ApiClientError } from './errors'
import type { ApiErrorPayload, ApiResponse } from './types'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return (
    isRecord(value) &&
    typeof value.code === 'string' &&
    typeof value.message === 'string' &&
    isRecord(value.details) &&
    Object.values(value.details).every((message) => typeof message === 'string')
  )
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  if (!isRecord(value) || typeof value.timestamp !== 'string' || !Object.hasOwn(value, 'data')) {
    return false
  }

  if (value.success === true) return value.error === null
  if (value.success === false) {
    return value.data === null && isApiErrorPayload(value.error)
  }

  return false
}

function parseBody(result: HttpResult): unknown {
  try {
    return JSON.parse(result.body)
  } catch (cause: unknown) {
    if (!(cause instanceof SyntaxError)) throw cause

    if (!result.ok) {
      throw new ApiClientError(
        'HTTP',
        `Request failed with HTTP ${result.status}`,
        result.status,
        undefined,
        { cause },
      )
    }

    throw new ApiClientError(
      'INVALID_RESPONSE',
      'Server response is not valid JSON',
      result.status,
      undefined,
      { cause },
    )
  }
}

export function unwrapResponse(result: HttpResult): unknown {
  const payload = parseBody(result)

  // A malformed body must not hide an HTTP failure.
  if (!result.ok) {
    const backendError =
      isApiResponse(payload) && payload.success === false ? payload.error : undefined

    throw new ApiClientError(
      'HTTP',
      backendError?.message ?? `Request failed with HTTP ${result.status}`,
      result.status,
      backendError,
    )
  }

  if (!isApiResponse(payload)) {
    throw new ApiClientError(
      'INVALID_RESPONSE',
      'Server response does not match the API contract',
      result.status,
    )
  }

  if (payload.success === false) {
    throw new ApiClientError('BUSINESS', payload.error.message, result.status, payload.error)
  }

  return payload.data
}
