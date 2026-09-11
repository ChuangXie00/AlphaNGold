import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { matchRoutes, Route, Routes, useLocation } from 'react-router'
import AppNav from './components/AppNav'
import AssistantPage from './pages/AssistantPage'
import DashboardPage from './pages/DashboardPage'
import MainPage from './pages/MainPage'
import NotFoundPage from './pages/NotFoundPage'

const pages = [
  { path: '/', element: <MainPage />, titleKey: 'nav.home' },
  { path: '/assistant', element: <AssistantPage />, titleKey: 'nav.assistant' },
  { path: '/dashboard', element: <DashboardPage />, titleKey: 'nav.dashboard' },
  { path: '*', element: <NotFoundPage />, titleKey: 'notFound.title' },
]

export default function App() {
  const { t } = useTranslation()
  const location = useLocation()
  const titleKey = matchRoutes(pages, location)?.at(-1)?.route.titleKey ?? 'notFound.title'

  useEffect(() => {
    document.title = `${t(titleKey)} | AlphaNGold`
  }, [t, titleKey])

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t('nav.skipToContent')}
      </a>
      <AppNav />

      <main id="main-content" tabIndex={-1}>
        <Routes>
          {pages.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}
        </Routes>
      </main>
      <footer className="site-footer">
        <span>AlphaNGold</span>
        <p>{t('footer.description')}</p>
      </footer>
    </>
  )
}
