import { apiGet, isRecord } from './apiClient'
import type { RequestOptions } from './apiClient'
import type { MyProjExp } from './types'

// check if value is MyProjExp type
function isMyProjExp(value: unknown): value is MyProjExp {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    typeof value.titleZh === 'string' &&
    typeof value.titleEn === 'string' &&
    typeof value.summaryZh === 'string' &&
    typeof value.summaryEn === 'string' &&
    typeof value.techStack === 'string' &&
    (typeof value.projectUrl === 'string' ||
      value.projectUrl === null) &&
    typeof value.displayOrder === 'number' &&
    Number.isInteger(value.displayOrder) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  )
}

function isProjectList(value: unknown): value is MyProjExp[] {
  return (
    Array.isArray(value) &&
    value.every(isMyProjExp)
  )
}

export function getMyProjExpList(
  options: RequestOptions = {}
): Promise<MyProjExp[]> {
  return apiGet('/api/v1/projects', isProjectList, options)
}