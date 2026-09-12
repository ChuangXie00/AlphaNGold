import axios from 'axios'
import type { AxiosInstance, AxiosResponse } from 'axios'
import { ApiClientError } from './errors'

export interface RequestOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

export interface HttpResult {
  status: number
  ok: boolean
  body: string
}

const DEFAULT_TIMEOUT_MS = 10_000
let instance: AxiosInstance | undefined

function getApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim()

  if (!configuredUrl) {
    throw new ApiClientError('CONFIG', 'VITE_API_BASE_URL is not configured')
  }

  let url: URL
  try {
    url = new URL(configuredUrl)
  } catch {
    throw new ApiClientError('CONFIG', 'VITE_API_BASE_URL must be a valid URL')
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username !== '' ||
    url.password !== '' ||
    url.pathname !== '/' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new ApiClientError('CONFIG', 'VITE_API_BASE_URL must contain only an HTTP(S) origin')
  }

  return url.origin
}

function getInstance(): AxiosInstance {
  if (instance === undefined) {
    // Delay configuration checks until a request so static routes can still render.
    instance = axios.create({
      baseURL: getApiBaseUrl(),
      adapter: 'xhr',
      timeout: DEFAULT_TIMEOUT_MS,
      headers: { Accept: 'application/json' },
      responseType: 'text',
      transformResponse: [(data: unknown): unknown => data],
      validateStatus: () => true,
      transitional: { clarifyTimeoutError: true },
    })
  }
  return instance
}

function rethrowTransportError(cause: unknown): never {
  if (!axios.isAxiosError(cause)) throw cause

  switch (cause.code) {
    case 'ERR_CANCELED':
      throw new ApiClientError('ABORTED', 'Request was cancelled', null, undefined, {
        cause,
      })
    case 'ETIMEDOUT':
      throw new ApiClientError('TIMEOUT', 'Request timed out', null, undefined, {
        cause,
      })
    // With clarifyTimeoutError, XHR uses this for browser aborts, not timeouts.
    case 'ERR_NETWORK':
    case 'ECONNABORTED':
      throw new ApiClientError('NETWORK', 'Unable to complete the request', null, undefined, {
        cause,
      })
    default:
      throw cause
  }
}

export async function get(path: string, options: RequestOptions = {}): Promise<HttpResult> {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new ApiClientError('CONFIG', 'API path must start with a single slash')
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new ApiClientError('CONFIG', 'Request timeout must be a positive number')
  }

  if (options.signal?.aborted) {
    throw new ApiClientError('ABORTED', 'Request was cancelled')
  }

  const client = getInstance()
  let response: AxiosResponse<unknown>
  try {
    response = await client.get<unknown>(path, {
      timeout: timeoutMs,
      signal: options.signal,
    })
  } catch (cause: unknown) {
    rethrowTransportError(cause)
  }

  // This indicates a broken internal adapter/configuration, not a network failure.
  if (typeof response.data !== 'string') {
    throw new TypeError('Expected the Axios transport to return a text response')
  }

  return {
    status: response.status,
    ok: response.status >= 200 && response.status < 300,
    body: response.data,
  }
}
