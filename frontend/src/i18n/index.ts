import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  readLanguagePreference,
  saveLanguagePreference,
  SUPPORTED_LANGUAGES,
} from './languagePreference'

i18n.on('languageChanged', (language: string) => {
  const supportedLanguage = isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE
  document.documentElement.lang = supportedLanguage
  saveLanguagePreference(supportedLanguage)
})

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: en,
    },
    'zh-CN': {
      translation: zhCN,
    },
  },
  lng: readLanguagePreference(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  load: 'currentOnly',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
