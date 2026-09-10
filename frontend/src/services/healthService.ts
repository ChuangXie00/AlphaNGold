import { apiGet, isRecord } from './apiClient'
import type { RequestOptions } from './apiClient'
import type { Health } from './types'

function isHealth(value: unknown): value is Health {
  return (
    isRecord(value) &&
    typeof value.status === 'string' &&
    typeof value.service === 'string'
  )
}

export function getHealth(
  options: RequestOptions = {}
): Promise<Health> {
  return apiGet('/api/v1/health', isHealth, options)
}