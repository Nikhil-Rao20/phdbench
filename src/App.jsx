import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
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

const TRANSITION_DURATION_MS = 3000

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
          transition={{ duration: 0.35 }}
        >
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.92, 1.02, 1.08, 1.3] }}
            transition={{ duration: 3, times: [0, 0.2, 0.7, 1], ease: 'easeInOut' }}
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
                className="font-display text-[clamp(64px,14vw,220px)] tracking-[0.18em] text-transparent bg-clip-text"
                style={{
                  backgroundImage: 'linear-gradient(120deg, #1a1914 0%, #448d65 45%, #1a1914 100%)',
                  textShadow: '0 12px 40px rgba(26,25,20,0.18)',
                }}
              >
                Nikhil Rao
              </h1>
              <motion.div
                className="text-xs uppercase tracking-[0.35em] text-ink-400"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
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
  const { user } = useAuth()
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

  // Still loading auth state
  if (user === undefined) return (
    <>
      <SEOManager isAuthenticated={false} />
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="w-8 h-8 border-2 border-ink-300 border-t-ink-900 rounded-full animate-spin" />
      </div>
    </>
  )

  if (!user || showLoginTransition) return (
    <>
      <SEOManager isAuthenticated={!!user} />
      <div className={showLoginTransition ? 'transition-all duration-500 blur-[6px] scale-[0.985] pointer-events-none' : 'transition-all duration-500'}>
        <LoginPage />
      </div>
      <LoginSuccessOverlay
        show={showLoginTransition}
        onDone={() => setShowLoginTransition(false)}
      />
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
