import type { ApiErrorPayload } from './types'

export type ApiErrorKind =
  'CONFIG' | 'NETWORK' | 'TIMEOUT' | 'ABORTED' | 'HTTP' | 'BUSINESS' | 'INVALID_RESPONSE'

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
    options?: ErrorOptions,
  ) {
    super(message, options)

    this.name = 'ApiClientError'
    this.kind = kind
    this.status = status
    this.code = error?.code ?? kind
    this.details = error?.details ?? {}
  }
}
