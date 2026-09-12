import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from '../api/client'
import * as contract from '../api/contract'
import { getHealth } from '../services/health/healthService'
import { getMyProjExpList } from '../services/myProjExp/myProjExpService'
import { failureEnvelope, httpResult, makeProject, successEnvelope } from './helpers'

vi.mock('../api/client', () => ({ get: vi.fn() }))
const getMock = vi.mocked(get)

beforeEach(() => {
  getMock.mockRejectedValue(new Error('Unexpected transport call in service test'))
})

describe('healthService', () => {
  it('uses the Health endpoint and unwraps real contract data', async () => {
    const health = { status: 'up', service: 'alphangold-java-backend' }
    getMock.mockResolvedValue(httpResult(successEnvelope(health)))
    await expect(getHealth()).resolves.toEqual(health)
    expect(getMock).toHaveBeenCalledExactlyOnceWith('/api/v1/health', {})
  })

  it.each([
    null,
    [],
    {},
    { status: 'up' },
    { status: 1, service: 'backend' },
    { status: 'up', service: null },
  ])('rejects invalid Health data %j', async (data) => {
    getMock.mockResolvedValue(httpResult(successEnvelope(data)))
    await expect(getHealth()).rejects.toMatchObject({ kind: 'INVALID_RESPONSE', status: 200 })
  })

  it('allows additional Health fields', async () => {
    const health = { status: 'up', service: 'alphangold-java-backend', version: 'optional' }
    getMock.mockResolvedValue(httpResult(successEnvelope(health)))
    await expect(getHealth()).resolves.toEqual(health)
  })

  it('forwards request options', async () => {
    const caller = new AbortController()
    const options = { timeoutMs: 25, signal: caller.signal }
    getMock.mockResolvedValue(
      httpResult(
        successEnvelope({
          status: 'up',
          service: 'alphangold-java-backend',
        }),
      ),
    )
    await getHealth(options)
    expect(getMock).toHaveBeenCalledExactlyOnceWith('/api/v1/health', options)
  })
})

describe('myProjExpService', () => {
  it('preserves fields, null links and server order', async () => {
    const projects = [makeProject({ id: 10, displayOrder: 20, projectUrl: null }), makeProject()]
    getMock.mockResolvedValue(httpResult(successEnvelope(projects)))
    await expect(getMyProjExpList()).resolves.toEqual(projects)
    expect(getMock).toHaveBeenCalledExactlyOnceWith('/api/v1/projects', {})
  })

  it('accepts an empty project list', async () => {
    getMock.mockResolvedValue(httpResult(successEnvelope([])))
    await expect(getMyProjExpList()).resolves.toEqual([])
  })

  it.each([null, {}, { projects: [] }])('rejects a non-array list %j', async (data) => {
    getMock.mockResolvedValue(httpResult(successEnvelope(data)))
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
  ])('rejects invalid project fields %j', async (invalidFields) => {
    getMock.mockResolvedValue(
      httpResult(successEnvelope([makeProject(), { ...makeProject(), ...invalidFields }])),
    )
    await expect(getMyProjExpList()).rejects.toMatchObject({
      kind: 'INVALID_RESPONSE',
      status: 200,
    })
  })

  it.each([
    'id',
    'titleZh',
    'titleEn',
    'summaryZh',
    'summaryEn',
    'techStack',
    'projectUrl',
    'displayOrder',
    'createdAt',
    'updatedAt',
  ])('rejects a missing required field %s', async (field) => {
    const incompleteProject = Object.fromEntries(
      Object.entries(makeProject()).filter(([key]) => key !== field),
    )
    getMock.mockResolvedValue(httpResult(successEnvelope([incompleteProject])))
    await expect(getMyProjExpList()).rejects.toMatchObject({ kind: 'INVALID_RESPONSE' })
  })

  it('allows additional project fields', async () => {
    const project = { ...makeProject(), category: 'optional' }
    getMock.mockResolvedValue(httpResult(successEnvelope([project])))
    await expect(getMyProjExpList()).resolves.toEqual([project])
  })

  it.each([
    { status: 500, kind: 'HTTP' },
    { status: 200, kind: 'BUSINESS' },
  ])('propagates $kind through the real contract', async ({ status, kind }) => {
    const payload = failureEnvelope()
    getMock.mockResolvedValue(httpResult(payload, status))
    await expect(getMyProjExpList()).rejects.toMatchObject({
      kind,
      status,
      code: payload.error.code,
      details: payload.error.details,
    })
  })

  it('forwards request options', async () => {
    const caller = new AbortController()
    const options = { signal: caller.signal, timeoutMs: 50 }
    getMock.mockResolvedValue(httpResult(successEnvelope([])))
    await getMyProjExpList(options)
    expect(getMock).toHaveBeenCalledExactlyOnceWith('/api/v1/projects', options)
  })

  it('preserves an exception from domain validation', async () => {
    const bug = new Error('Unexpected domain guard failure')
    getMock.mockResolvedValue(httpResult(successEnvelope([makeProject()])))
    vi.spyOn(contract, 'isRecord').mockImplementation(() => {
      throw bug
    })
    await expect(getMyProjExpList()).rejects.toBe(bug)
  })

  it('preserves an unexpected transport exception', async () => {
    const bug = new Error('Unexpected transport implementation failure')
    getMock.mockRejectedValue(bug)
    await expect(getMyProjExpList()).rejects.toBe(bug)
  })
})
