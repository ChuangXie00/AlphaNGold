import { describe, expect, it, vi } from 'vitest'
import i18n from '../i18n'
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  readLanguagePreference,
  saveLanguagePreference,
} from '../i18n/languagePreference'

describe('language preference', () => {
  it.each(['en', 'zh-CN'] as const)('restores a saved %s preference', (language) => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)

    expect(readLanguagePreference()).toBe(language)
  })

  it('defaults to English when there is no saved preference', () => {
    window.localStorage.removeItem(LANGUAGE_STORAGE_KEY)

    expect(readLanguagePreference()).toBe(DEFAULT_LANGUAGE)
  })

  it.each(['', 'zh', 'fr', 'undefined', 'ZH-CN', ' zh-CN '])(
    'ignores unsupported or malformed preference %j',
    (language) => {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)

      expect(readLanguagePreference()).toBe(DEFAULT_LANGUAGE)
    },
  )

  it('still starts in English when the browser blocks access to storage', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError')
    })

    expect(readLanguagePreference()).toBe(DEFAULT_LANGUAGE)
  })

  it('still starts in English when reading a preference fails', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError')
    })

    expect(readLanguagePreference()).toBe(DEFAULT_LANGUAGE)
  })

  it('stores a language choice for the next visit', () => {
    saveLanguagePreference('zh-CN')

    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh-CN')
    expect(readLanguagePreference()).toBe('zh-CN')
  })

  it('does not throw when the browser rejects a preference write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError')
    })

    expect(() => saveLanguagePreference('zh-CN')).not.toThrow()
  })
})

describe('i18n language synchronization', () => {
  it('keeps the document language and saved preference aligned with programmatic changes', async () => {
    await i18n.changeLanguage('zh-CN')

    expect(i18n.resolvedLanguage).toBe('zh-CN')
    expect(document.documentElement.lang).toBe('zh-CN')
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh-CN')

    await i18n.changeLanguage('en')

    expect(document.documentElement.lang).toBe('en')
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
  })

  it('applies a restored preference when i18n initializes', async () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'zh-CN')
    vi.resetModules()

    const { default: restoredI18n } = await import('../i18n')

    expect(restoredI18n.resolvedLanguage).toBe('zh-CN')
    expect(document.documentElement.lang).toBe('zh-CN')
  })

  it('changes the current language and document language even when storage is unavailable', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError')
    })

    await expect(i18n.changeLanguage('zh-CN')).resolves.toBeTypeOf('function')

    expect(i18n.resolvedLanguage).toBe('zh-CN')
    expect(document.documentElement.lang).toBe('zh-CN')
  })
})
