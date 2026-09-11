import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export default function AssistantPage() {
  const { t } = useTranslation()

  return (
    <div className="simple-page">
      <section className="simple-page__panel" aria-labelledby="assistant-heading">
        <p className="simple-page__badge">{t('common.comingSoon')}</p>

        <h1 id="assistant-heading">{t('assistant.title')}</h1>

        <p className="simple-page__description">{t('assistant.description')}</p>

        <p className="simple-page__notice">{t('assistant.notice')}</p>

        <Link className="simple-page__home" to="/">
          {t('common.backHome')}
        </Link>
      </section>
    </div>
  )
}
