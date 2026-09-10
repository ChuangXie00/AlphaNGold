import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getHealth } from '../services/healthService'
import { getMyProjExpList } from '../services/myProjExpService'
import {
  API_BASE_URL,
  failureEnvelope,
  jsonResponse,
  makeProject,
  pendingUntilAbort,
  successEnvelope,
} from './helpers'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', API_BASE_URL)
  vi.stubGlobal('fetch', fetchMock)
})

describe('healthService', () => {
  it('calls the real client with the Health path and unwraps the response', async () => {
    const health = { status: 'up', service: 'alphangold-java-backend' }
    fetchMock.mockResolvedValue(jsonResponse(successEnvelope(health)))
    await expect(getHealth()).resolves.toEqual(health)
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/health`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it.each([
    null,
    [],
    {},
    { status: 'up' },
    { status: 1, service: 'backend' },
    { status: 'up', service: null },
  ])('rejects invalid Health data %j', async (data) => {
    fetchMock.mockResolvedValue(jsonResponse(successEnvelope(data)))
    await expect(getHealth()).rejects.toMatchObject({ kind: 'INVALID_RESPONSE' })
  })

  it('forwards the timeout option to the client', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation((_input, init) => pendingUntilAbort(init?.signal))
    const assertion = expect(getHealth({ timeoutMs: 25 })).rejects.toMatchObject({
      kind: 'TIMEOUT',
    })
    await vi.advanceTimersByTimeAsync(25)
    await assertion
  })
})

describe('myProjExpService', () => {
  it('calls Projects, preserving all fields, null links and server order', async () => {
    const projects = [makeProject({ id: 10, displayOrder: 20, projectUrl: null }), makeProject()]
    fetchMock.mockResolvedValue(jsonResponse(successEnvelope(projects)))
    await expect(getMyProjExpList()).resolves.toEqual(projects)
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/projects`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('accepts an empty project list', async () => {
    fetchMock.mockResolvedValue(jsonResponse(successEnvelope([])))
    await expect(getMyProjExpList()).resolves.toEqual([])
  })

  it.each([null, {}, { projects: [] }])('rejects a non-array list %j', async (data) => {
    fetchMock.mockResolvedValue(jsonResponse(successEnvelope(data)))
    await expect(getMyProjExpList()).rejects.toMatchObject({ kind: 'INVALID_RESPONSE' })
  })

  it.each([
    { id: '9' },
    { id: Number.MAX_SAFE_INTEGER + 1 },
    { titleZh: null },
    { titleEn: 123 },
    { summaryZh: null },
    { summaryEn: [] },
    { techStack: ['React'] },
    { projectUrl: 123 },
    { displayOrder: 1.5 },
    { createdAt: null },
    { updatedAt: 123 },
  ])('rejects a list containing invalid project fields %j', async (invalidFields) => {
    fetchMock.mockResolvedValue(
      jsonResponse(successEnvelope([makeProject(), { ...makeProject(), ...invalidFields }])),
    )
    await expect(getMyProjExpList()).rejects.toMatchObject({ kind: 'INVALID_RESPONSE' })
  })

  it('propagates a backend error from the real client', async () => {
    fetchMock.mockResolvedValue(jsonResponse(failureEnvelope(), 500))
    await expect(getMyProjExpList()).rejects.toMatchObject({
      kind: 'HTTP',
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
    })
  })

  it('forwards caller cancellation to the client', async () => {
    const caller = new AbortController()
    fetchMock.mockImplementation((_input, init) => pendingUntilAbort(init?.signal))
    const assertion = expect(getMyProjExpList({ signal: caller.signal })).rejects.toMatchObject({
      kind: 'ABORTED',
    })
    caller.abort()
    await assertion
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
  })
})
