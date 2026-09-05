import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  LayoutDashboard, Lightbulb, FileText, CalendarClock,
  BarChart3, Settings, Search,
} from 'lucide-react'
import ProfileDropdown, { Avatar } from './ProfileDropdown'
import { useAuth } from '../hooks/useAuth'
import { cn, Tooltip } from './ui'

const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/leads',        icon: Lightbulb,       label: 'Leads' },
  { to: '/applications', icon: FileText,        label: 'Applications' },
  { to: '/deadlines',    icon: CalendarClock,   label: 'Deadlines' },
  { to: '/stats',        icon: BarChart3,       label: 'Stats' },
  { to: '/settings',     icon: Settings,        label: 'Settings' },
]

/** Items shown in the mobile dock. Settings lives behind the profile button. */
const DOCK_NAV = NAV.slice(0, 5)

const BRAND_LOGO = `${import.meta.env.BASE_URL}NikhilRao.png`

// ─── Desktop sidebar ─────────────────────────────────────────────────────────

function Sidebar() {
  return (
    <div className="flex flex-col h-full bg-ink-950 text-white p-4">
      <div className="flex items-center gap-3 px-2 py-3 mb-6">
        <img
          src={BRAND_LOGO}
          alt=""
          className="w-8 h-8 rounded-lg object-cover shrink-0 ring-1 ring-ink-700"
        />
        <div>
          <div className="font-display text-base leading-none">PhDBench</div>
          <div className="text-ink-500 text-xs mt-1">Application tracker</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1" aria-label="Main">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-600',
              isActive ? 'text-white' : 'text-ink-300 hover:text-white hover:bg-ink-800/60',
            )}
          >
            {({ isActive }) => (
              <>
                {/* The active pill slides between items rather than blinking —
                    it shows you where you moved from (charter #13). */}
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-ink-800"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  />
                )}
                <Icon size={17} className="relative z-10 shrink-0" aria-hidden="true" />
                <span className="relative z-10">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-ink-800 pt-3 mt-4">
        <ProfileDropdown />
      </div>
    </div>
  )
}

// ─── Mobile dock ─────────────────────────────────────────────────────────────

/**
 * A floating dock instead of a hamburger drawer.
 *
 * The drawer it replaces cost two taps to reach anything and hid the app's
 * structure behind an icon. The dock keeps every destination one thumb-reach
 * away at the bottom of the screen, which is where a phone is actually held.
 */
function MobileDock() {
  const location = useLocation()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [pressed, setPressed] = useState(null)

  const isActive = (to) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to))

  return (
    <nav
      aria-label="Main"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 pointer-events-none
                 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto max-w-md px-4 pb-4 pointer-events-auto">
        <div
          className="flex items-center justify-between gap-1 p-2
                     rounded-3xl bg-ink-950/95 backdrop-blur-xl shadow-dock
                     ring-1 ring-white/10"
        >
          {DOCK_NAV.map(({ to, icon: Icon, label }) => {
            const active = isActive(to)
            return (
              <button
                key={to}
                onClick={() => navigate(to)}
                onPointerDown={() => setPressed(to)}
                onPointerUp={() => setPressed(null)}
                onPointerLeave={() => setPressed(null)}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className="relative flex-1 flex flex-col items-center justify-center gap-1
                           py-2 rounded-2xl
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
              >
                {active && (
                  <motion.span
                    layoutId="dock-active"
                    className="absolute inset-0 rounded-2xl bg-white/10"
                    transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}

                {/* The dock's signature move: the active icon lifts. */}
                <motion.span
                  className="relative z-10"
                  animate={{
                    y: active ? -2 : 0,
                    scale: pressed === to ? 0.88 : active ? 1.12 : 1,
                  }}
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 26 }}
                >
                  <Icon
                    size={19}
                    className={active ? 'text-white' : 'text-ink-400'}
                    aria-hidden="true"
                  />
                </motion.span>

                <span
                  className={cn(
                    'relative z-10 text-[10px] leading-none transition-colors duration-150',
                    active ? 'text-white font-medium' : 'text-ink-400',
                  )}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

// ─── Mobile top bar ──────────────────────────────────────────────────────────

function MobileTopBar() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3
                    bg-ink-50/90 backdrop-blur-md border-b border-ink-200/60">
      <img src={BRAND_LOGO} alt="" className="w-7 h-7 rounded-lg object-cover ring-1 ring-ink-200" />
      <span className="font-display text-lg text-ink-900">PhDBench</span>

      <div className="flex-1" />

      <Tooltip label="Search" side="bottom">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('phdbench:open-search'))}
          aria-label="Search"
          className="p-2 rounded-xl text-ink-500 hover:bg-ink-100 hover:text-ink-800
                     active:scale-95 transition-all duration-150
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400"
        >
          <Search size={18} aria-hidden="true" />
        </button>
      </Tooltip>

      <button
        onClick={() => navigate('/settings')}
        aria-label="Settings and profile"
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400"
      >
        <Avatar user={user} size={30} />
      </button>
    </div>
  )
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function Layout({ children }) {
  const location = useLocation()
  const mainRef = useRef(null)
  const reduceMotion = useReducedMotion()

  // Scroll to the top on navigation. Without this, moving from a long list to a
  // short page leaves you looking at blank space and wondering if it loaded.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-ink-50">
      <aside className="hidden lg:block w-56 shrink-0 h-full">
        <Sidebar />
      </aside>

      <main ref={mainRef} className="flex-1 min-w-0 h-full overflow-y-auto">
        <MobileTopBar />

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            // Bottom padding clears the floating dock on mobile.
            className="px-5 py-6 sm:px-6 lg:px-8 lg:py-8 pb-32 lg:pb-8 max-w-6xl mx-auto"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <MobileDock />
    </div>
  )
}
