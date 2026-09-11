import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import i18n from '../i18n'

beforeEach(async () => {
  localStorage.clear()
  // Tests must opt into a mock response; never call a real backend by accident.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('Unexpected fetch in test'))),
  )
  await i18n.changeLanguage('en')
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.resetAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  // Restore storage spies/globals first so exception tests cannot leak or break cleanup.
  localStorage.clear()
})
