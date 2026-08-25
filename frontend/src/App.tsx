import { Route, Routes } from 'react-router'
import AppNav from './components/AppNav'
import AssistantPage from './pages/AssistantPage'
import DashboardPage from './pages/DashboardPage'
import MainPage from './pages/MainPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <>
      <AppNav />

      <main>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  )
}
