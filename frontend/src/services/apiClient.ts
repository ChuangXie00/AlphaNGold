import type { ApiErrorPayload, ApiResponse } from './types'

export type ApiErrorKind =
  | 'CONFIG'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'HTTP'
  | 'BUSINESS'
  | 'INVALID_RESPONSE'

export interface RequestOptions {
  signal?: AbortSignal
  timeoutMs? : number
}

// pages can show diff msg based on error kind

export class ApiClientError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly code: string
  readonly details: Record<string, string>

  constructor(
    kind: ApiErrorKind,
    message: string,
    status: number | null = null,
    error?: ApiErrorPayload,
  ) {
    super(message)
    this.name = 'ApiClinetError'
    this.kind = kind
    this.status = status
    this.code = error?.code ?? kind
    this.details = error?.details ?? {}
  }
}

const DEFAULT_TIMEOUT_MS = 10000

// TS type never check the response data
// we should check the data in runtime
export function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isApiErrorPayload(value: unknown) : value is ApiErrorPayload {
  return (
    isRecord(value) &&
    typeof value.code === 'string' &&
    typeof value.message === 'string' &&
    isRecord(value.details) &&
    Object.values(value.details).every(
      (msg) => typeof msg === 'string',
    )
  )
}

function isApiResponse(value: unknown): value is ApiResponse<unknown>  {
  if(!isRecord(value) ||
    typeof value.timestamp !== 'string' ||
    !Object.hasOwn(value, 'data')
  ) {
    return false
  }

  if(value.success === true) {
    return value.error === null
  }

  if(value.success === false) {
    return value.data === null && isApiErrorPayload(value.error)
  }

  return false
}

// Check config when request
function getApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim()

  if(!configuredUrl) {
    throw new ApiClientError(
      'CONFIG',
      'VITE_API_BASE_URL is not configured'
    )
  }

  let url: URL

  try {
    url = new URL(configuredUrl)
  } catch {
    throw new ApiClientError(
      'CONFIG',
      'VITE_API_BASE_URL must be a valid URL'
    )
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username !== '' ||
    url.password !== '' ||
    url.pathname !== '/' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new ApiClientError(
      'CONFIG',
      'VITE_API_BASE_URL must contain only an HTTP(S) origin',
    )
  }

  return url.origin
}


// isData is provided by exact service to check if data is the expected type
export async function apiGet<T>(
  path: string,
  isData: (value: unknown) => value is T,
  options: RequestOptions = {}
) : Promise<T> {
  const baseUrl = getApiBaseUrl()
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new ApiClientError(
      'CONFIG',
      'API path must start with a single slash',
    )
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new ApiClientError(
      'CONFIG',
      'Request timeout must be a positive number',
    )
  }

  if (options.signal?.aborted) {
    throw new ApiClientError('ABORTED', 'Request was cancelled')
  }

  const controller = new AbortController()
  let timedOut = false

  const cancelRequest = () => {
    controller.abort()
  }

  options.signal?.addEventListener('abort', cancelRequest, {
    once: true,
  })

  const timer = setTimeout(() => {
    if (!controller.signal.aborted) {
      timedOut = true
      controller.abort()
    }
  }, timeoutMs)

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    let payload: unknown

    try {
      payload = await response.json()
    } catch (error) {
      // 读取响应体时也可能发生取消或超时，交给外层处理。
      if (controller.signal.aborted) {
        throw error
      }

      // 例如代理返回 HTML 错误页，保留 HTTP 状态。
      if (!response.ok) {
        throw new ApiClientError(
          'HTTP',
          `Request failed with HTTP ${response.status}`,
          response.status,
        )
      }

      throw new ApiClientError(
        'INVALID_RESPONSE',
        'Server response is not valid JSON',
        response.status,
      )
    }

    if (!response.ok) {
      const backendError =
        isApiResponse(payload) && payload.success === false
          ? payload.error
          : undefined

      throw new ApiClientError(
        'HTTP',
        backendError?.message ??
          `Request failed with HTTP ${response.status}`,
        response.status,
        backendError,
      )
    }

    if (!isApiResponse(payload)) {
      throw new ApiClientError(
        'INVALID_RESPONSE',
        'Server response does not match the API contract',
        response.status,
      )
    }

    // 即使 HTTP 为 200，也检查业务层是否报告失败。
    if (payload.success === false) {
      throw new ApiClientError(
        'BUSINESS',
        payload.error.message,
        response.status,
        payload.error,
      )
    }

    if (!isData(payload.data)) {
      throw new ApiClientError(
        'INVALID_RESPONSE',
        'Response data does not match the expected structure',
        response.status,
      )
    }

    return payload.data
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiClientError(
        timedOut ? 'TIMEOUT' : 'ABORTED',
        timedOut ? 'Request timed out' : 'Request was cancelled',
      )
    }

    if (error instanceof ApiClientError) {
      throw error
    }

    // 浏览器无法可靠区分断网、连接失败和 CORS 拒绝。
    throw new ApiClientError(
      'NETWORK',
      'Unable to reach the server',
    )
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', cancelRequest)
  }
}