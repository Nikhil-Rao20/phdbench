import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from './hooks/useAuth'
import { DataProvider } from './hooks/useData'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import SEOManager from './components/SEOManager'
import NotAuthorized from './components/NotAuthorized'
import { PageSkeleton } from './components/Skeleton'
import CommandPalette from './components/CommandPalette'
import Dashboard from './pages/Dashboard'

const LeadsPage = lazy(() => import('./pages/LeadsPage'))
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage'))
const DeadlinesPage = lazy(() => import('./pages/DeadlinesPage'))
const StatsPage = lazy(() => import('./pages/StatsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ArchivePage = lazy(() => import('./pages/ArchivePage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

const TRANSITION_DURATION_MS = 2200

function LoginSuccessOverlay({ show, onDone }) {
  useEffect(() => {
    if (!show) return undefined
    const timer = setTimeout(onDone, TRANSITION_DURATION_MS)
    return () => clearTimeout(timer)
  }, [show, onDone])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[80] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.94, 1.02, 1.06, 1.2] }}
            transition={{ duration: TRANSITION_DURATION_MS / 1000, times: [0, 0.22, 0.7, 1], ease: 'easeInOut' }}
          >
            <div
              className="absolute h-[60vh] w-[60vh] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(222,238,230,0.8) 0%, rgba(255,255,255,0) 70%)',
                filter: 'blur(6px)',
              }}
            />
            <div className="relative flex flex-col items-center gap-6">
              <h1
                className="font-display text-[clamp(56px,12vw,180px)] tracking-[0.16em] text-transparent bg-clip-text"
                style={{
                  backgroundImage: 'linear-gradient(120deg, #1a1914 0%, #448d65 45%, #1a1914 100%)',
                }}
              >
                Nikhil Rao
              </h1>
              <motion.div
                className="text-xs uppercase tracking-[0.35em] text-ink-400"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                Entering your bench
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function App() {
  const { user, isImpostor } = useAuth()
  const [showLoginTransition, setShowLoginTransition] = useState(false)
  const authStatusRef = useRef('unknown')

  useEffect(() => {
    if (user === undefined) return
    const status = user ? 'authed' : 'guest'
    if (status === 'authed' && authStatusRef.current === 'guest') {
      setShowLoginTransition(true)
    }
    authStatusRef.current = status
  }, [user])

  // Auth still resolving.
  if (user === undefined) {
    return (
      <>
        <SEOManager isAuthenticated={false} />
        <div className="min-h-screen flex items-center justify-center bg-ink-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-ink-200 border-t-ink-900 rounded-full animate-spin" />
            <p className="text-sm text-ink-400">Checking your session…</p>
          </div>
        </div>
      </>
    )
  }

  // Signed in with the wrong account.
  if (isImpostor) {
    return (
      <>
        <SEOManager isAuthenticated={false} />
        <NotAuthorized />
      </>
    )
  }

  if (!user || showLoginTransition) {
    return (
      <>
        <SEOManager isAuthenticated={!!user} />
        <div className={showLoginTransition
          ? 'transition-all duration-500 blur-[6px] scale-[0.985] pointer-events-none'
          : 'transition-all duration-500'}>
          <LoginPage />
        </div>
        <LoginSuccessOverlay
          show={showLoginTransition}
          onDone={() => setShowLoginTransition(false)}
        />
      </>
    )
  }

  return (
    <DataProvider>
      <SEOManager isAuthenticated />
      <CommandPalette />
      <Layout>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/"             element={<Dashboard />} />
            <Route path="/leads"        element={<LeadsPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/deadlines"    element={<DeadlinesPage />} />
            <Route path="/stats"        element={<StatsPage />} />
            <Route path="/settings"     element={<SettingsPage />} />
            <Route path="/archive"      element={<ArchivePage />} />
            {/* A wrong URL used to silently redirect to the dashboard, which
                hides typos and broken links. It now says what happened. */}
            <Route path="*"             element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </DataProvider>
  )
}
