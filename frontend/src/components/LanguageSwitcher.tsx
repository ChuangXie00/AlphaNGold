import { useTranslation } from 'react-i18next'

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language

  return (
    <div className="language-switcher" role="group" aria-label={t('language.label')}>
      <button
        type="button"
        lang="en"
        aria-label="English"
        aria-pressed={language === 'en'}
        onClick={() => void i18n.changeLanguage('en')}
      >
        EN
      </button>
      <button
        type="button"
        lang="zh-CN"
        aria-label="简体中文"
        aria-pressed={language === 'zh-CN'}
        onClick={() => void i18n.changeLanguage('zh-CN')}
      >
        中文
      </button>
    </div>
  )
}
