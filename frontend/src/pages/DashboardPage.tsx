import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export default function DashboardPage() {
  const { t } = useTranslation()

  return (
    <div className="simple-page">
      <section className="simple-page__panel" aria-labelledby="dashboard-heading">
        <p className="simple-page__badge">{t('common.comingSoon')}</p>

        <h1 id="dashboard-heading">{t('dashboard.title')}</h1>

        <p className="simple-page__description">{t('dashboard.description')}</p>

        <p className="simple-page__notice">{t('dashboard.notice')}</p>

        <Link className="simple-page__home" to="/">
          {t('common.backHome')}
        </Link>
      </section>
    </div>
  )
}
