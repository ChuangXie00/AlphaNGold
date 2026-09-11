import { useTranslation } from 'react-i18next'

export default function AssistantPage() {
  const { t } = useTranslation()
  return (
    <div className="simple-page">
      <h1>{t('assistant.title')}</h1>
    </div>
  )
}
