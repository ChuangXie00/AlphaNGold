import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router'
import LanguageSwitcher from './LanguageSwitcher'

export default function AppNav() {
  const { t } = useTranslation()

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="site-brand" aria-label={t('nav.brandHome')}>
          <span className="site-brand__mark" aria-hidden="true">
            A<span>G</span>
          </span>
          <span>AlphaNGold</span>
        </Link>
        <nav className="site-nav" aria-label={t('nav.label')}>
          <NavLink to="/" end>
            {t('nav.home')}
          </NavLink>
          <NavLink to="/assistant">{t('nav.assistant')}</NavLink>
          <NavLink to="/dashboard">{t('nav.dashboard')}</NavLink>
        </nav>
        <LanguageSwitcher />
      </div>
    </header>
  )
}
