import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="simple-page">
      <section className="simple-page__panel" aria-labelledby="not-found-heading">
        <p className="simple-page__code" aria-hidden="true">
          404
        </p>

        <h1 id="not-found-heading">{t('notFound.title')}</h1>

        <p className="simple-page__description">{t('notFound.description')}</p>

        <Link className="simple-page__home" to="/">
          {t('common.backHome')}
        </Link>
      </section>
    </div>
  )
}
