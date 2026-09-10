import type { MyProjExp } from '../services/types'

export const API_BASE_URL = 'http://api.test:8080'
const TIMESTAMP = '2026-09-10T08:00:00Z'

export function makeProject(overrides: Partial<MyProjExp> = {}): MyProjExp {
  return {
    id: 9,
    titleZh: '海绵宝宝：带薪厕所调度系统',
    titleEn: 'SpongeBob: Paid Bathroom Break Scheduler',
    summaryZh: '海绵宝宝为蟹堡王员工争取三分钟的尊严。',
    summaryEn: 'SpongeBob guarantees three minutes of employee dignity.',
    techStack: 'React, Spring Boot, PostgreSQL',
    projectUrl: 'https://example.com/bathroom',
    displayOrder: 10,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  }
}

export function successEnvelope(data: unknown) {
  return { success: true, data, error: null, timestamp: TIMESTAMP }
}

export function failureEnvelope() {
  return {
    success: false,
    data: null,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected server error occurred',
      details: { project: 'Unavailable' },
    },
    timestamp: TIMESTAMP,
  }
}

export function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Tests choose exactly when a request succeeds or fails, without real sleeps.
export function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

// A pending fetch/body must reject on abort just as the browser does.
export function pendingUntilAbort(signal: AbortSignal | null | undefined): Promise<never> {
  if (!signal) throw new Error('Expected the request to include an AbortSignal')
  return new Promise((_, reject) => {
    const abort = () => reject(new DOMException('Request cancelled', 'AbortError'))
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  })
}
