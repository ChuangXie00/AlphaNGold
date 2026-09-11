import { useTranslation } from 'react-i18next'

export default function DashboardPage() {
  const { t } = useTranslation()
  return (
    <div className="simple-page">
      <h1>{t('dashboard.title')}</h1>
    </div>
  )
}
