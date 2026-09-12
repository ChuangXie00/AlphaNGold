export interface ApiErrorPayload {
  code: string
  message: string
  details: Record<string, string>
}

export type ApiResponse<T> =
  | {
      success: true
      data: T
      error: null
      timestamp: string
    }
  | {
      success: false
      data: null
      error: ApiErrorPayload
      timestamp: string
    }
