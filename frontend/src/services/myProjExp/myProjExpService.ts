import { get } from '../../api/client'
import type { RequestOptions } from '../../api/client'
import { isRecord, unwrapResponse } from '../../api/contract'
import { ApiClientError } from '../../api/errors'
import type { MyProjExp } from './types'

function isMyProjExp(value: unknown): value is MyProjExp {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    typeof value.titleZh === 'string' &&
    typeof value.titleEn === 'string' &&
    typeof value.summaryZh === 'string' &&
    typeof value.summaryEn === 'string' &&
    typeof value.techStack === 'string' &&
    (typeof value.projectUrl === 'string' || value.projectUrl === null) &&
    typeof value.displayOrder === 'number' &&
    Number.isInteger(value.displayOrder) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  )
}

function isProjectList(value: unknown): value is MyProjExp[] {
  return Array.isArray(value) && value.every(isMyProjExp)
}

export async function getMyProjExpList(options: RequestOptions = {}): Promise<MyProjExp[]> {
  const result = await get('/api/v1/projects', options)
  const data = unwrapResponse(result)

  if (!isProjectList(data)) {
    throw new ApiClientError(
      'INVALID_RESPONSE',
      'Response data does not match the expected project list structure',
      result.status,
    )
  }
  return data
}
