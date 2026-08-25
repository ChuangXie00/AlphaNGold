import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'

export default function AppNav() {
  const { t } = useTranslation()

  return (
    <nav>
      <NavLink to="/">{t('nav.home')}</NavLink>
      {' | '}
      <NavLink to="/assistant">{t('nav.assistant')}</NavLink>
      {' | '}
      <NavLink to="/dashboard">{t('nav.dashboard')}</NavLink>
    </nav>
  )
}
