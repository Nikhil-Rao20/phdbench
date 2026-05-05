import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Lightbulb, FileText,
  CalendarClock, BarChart3, LogOut, Menu, X, Settings
} from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/leads',        icon: Lightbulb,       label: 'Leads' },
  { to: '/applications', icon: FileText,         label: 'Applications' },
  { to: '/deadlines',    icon: CalendarClock,    label: 'Deadlines' },
  { to: '/stats',        icon: BarChart3,        label: 'Stats' },
  { to: '/settings',     icon: Settings,         label: 'Settings' },
]

const BRAND_LOGO = `${import.meta.env.BASE_URL}NikhilRao.png`

function Sidebar({ onClose }) {
  const { user, logout } = useAuth()

  return (
    <div className="flex flex-col h-full bg-ink-950 text-white p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 py-3 mb-6">
        <img
          src={BRAND_LOGO}
          alt="Nikhil Rao"
          className="w-8 h-8 rounded-lg object-cover shrink-0 ring-1 ring-ink-700"
        />
        <div>
          <div className="font-display text-base leading-none">PhDBench</div>
          <div className="text-ink-500 text-xs mt-0.5">Application tracker</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-ink-500 hover:text-white p-1">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="border-t border-ink-800 pt-4 mt-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <img
            src={user?.photoURL || ''}
            alt=""
            className="w-7 h-7 rounded-full object-cover ring-1 ring-ink-700"
          />
          <div className="min-w-0">
            <div className="text-sm text-ink-200 truncate">{user?.displayName?.split(' ')[0]}</div>
            <div className="text-xs text-ink-500 truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="nav-item w-full text-rose-400 hover:text-rose-300 hover:bg-rose-950"
        >
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  )
}

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f6f5f0' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-56 shrink-0 h-full">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-56 lg:hidden"
            >
              <Sidebar onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 min-w-0 h-full overflow-y-auto">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 p-4 border-b border-ink-200 bg-white">
          <button onClick={() => setMobileOpen(true)} className="text-ink-600">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img
              src={BRAND_LOGO}
              alt="Nikhil Rao"
              className="w-6 h-6 rounded-md object-cover ring-1 ring-ink-200"
            />
            <span className="font-display text-base text-ink-900">PhDBench</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="p-6 lg:p-8 max-w-6xl mx-auto"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
