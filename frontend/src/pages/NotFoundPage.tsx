import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="simple-page">
      <h1>{t('notFound.title')}</h1>
    </div>
  )
}
