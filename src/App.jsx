import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage   from './pages/LoginPage'
import Layout      from './components/Layout'
import SEOManager  from './components/SEOManager'
import Dashboard   from './pages/Dashboard'
import SettingsPage from './pages/SettingsPage'

const LeadsPage = lazy(() => import('./pages/LeadsPage'))
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage'))
const DeadlinesPage = lazy(() => import('./pages/DeadlinesPage'))
const StatsPage = lazy(() => import('./pages/StatsPage'))

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-ink-300 border-t-ink-800 rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  const { user } = useAuth()

  // Still loading auth state
  if (user === undefined) return (
    <>
      <SEOManager isAuthenticated={false} />
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="w-8 h-8 border-2 border-ink-300 border-t-ink-900 rounded-full animate-spin" />
      </div>
    </>
  )

  if (!user) return (
    <>
      <SEOManager isAuthenticated={false} />
      <LoginPage />
    </>
  )

  return (
    <>
      <SEOManager isAuthenticated />
      <Layout>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/"             element={<Dashboard />} />
            <Route path="/leads"        element={<LeadsPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/deadlines"    element={<DeadlinesPage />} />
            <Route path="/stats"        element={<StatsPage />} />
            <Route path="/settings"     element={<SettingsPage />} />
            <Route path="*"             element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </>
  )
}
