export const SUPPORTED_LANGUAGES = ['en', 'zh-CN'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en'
export const LANGUAGE_STORAGE_KEY = 'alphangold.language'

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return value === 'en' || value === 'zh-CN'
}

export function readLanguagePreference(): SupportedLanguage {
  try {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isSupportedLanguage(savedLanguage) ? savedLanguage : DEFAULT_LANGUAGE
  } catch {
    // Storage can be blocked by browser settings; the page must still render.
    return DEFAULT_LANGUAGE
  }
}

export function saveLanguagePreference(language: SupportedLanguage): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Language changes still work for this session when persistence is unavailable.
  }
}
