// error info from backend, ErrorOutVO
export interface ApiErrorPayload {
  code: string
  message: string
  details: Record<string, string>
}

// recognize response status by 'success'
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

// HealthOutVO
export interface Health {
  status: string
  service: string
}

// MyProjExpVO
export interface MyProjExp {
  id: number
  titleZh: string
  titleEn: string
  summaryZh: string
  summaryEn: string
  techStack: string
  projectUrl: string | null
  displayOrder: number
  createdAt: string
  updatedAt: string
}