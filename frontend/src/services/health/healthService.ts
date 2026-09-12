import { get } from '../../api/client'
import type { RequestOptions } from '../../api/client'
import { isRecord, unwrapResponse } from '../../api/contract'
import { ApiClientError } from '../../api/errors'
import type { Health } from './types'

function isHealth(value: unknown): value is Health {
  return isRecord(value) && typeof value.status === 'string' && typeof value.service === 'string'
}

export async function getHealth(options: RequestOptions = {}): Promise<Health> {
  const result = await get('/api/v1/health', options)
  const data = unwrapResponse(result)

  if (!isHealth(data)) {
    throw new ApiClientError(
      'INVALID_RESPONSE',
      'Response data does not match the expected Health structure',
      result.status,
    )
  }
  return data
}
