// src/components/ProfileDropdown.jsx
// Adapted from the Kokonut UI profile-dropdown pattern.
//
// It replaces a static avatar-and-email block that looked interactive and was
// not (charter #6 — a thing that looks clickable must be clickable). It is also
// where the backup export belongs: the most valuable action in the app should
// not be buried three levels into Settings.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Settings, LogOut, Download, Archive, ChevronsUpDown, User } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { cn } from './ui'

function Avatar({ user, size = 28 }) {
  const [failed, setFailed] = useState(false)
  const initial = (user?.displayName || user?.email || '?').trim().charAt(0).toUpperCase()

  // Google profile images fail to load often enough — rate limits, blocked
  // third-party requests — that a broken-image icon in the sidebar is a real
  // outcome. Fall back to an initial rather than a broken frame.
  if (!user?.photoURL || failed) {
    return (
      <span
        className="rounded-full bg-sage-500 text-white flex items-center justify-center
                   font-medium shrink-0 ring-1 ring-ink-700"
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        aria-hidden="true"
      >
        {initial}
      </span>
    )
  }

  return (
    <img
      src={user.photoURL}
      alt=""
      onError={() => setFailed(true)}
      className="rounded-full object-cover shrink-0 ring-1 ring-ink-700"
      style={{ width: size, height: size }}
    />
  )
}

export default function ProfileDropdown({ onNavigate }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // Close on outside click and on Escape — both expected of a menu, and both
  // missing is a common way these feel broken.
  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    const onKeyDown = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const go = (path) => {
    setOpen(false)
    onNavigate?.()
    navigate(path)
  }

  const items = [
    { label: 'Settings & profile', icon: Settings, onClick: () => go('/settings') },
    { label: 'Archive',            icon: Archive,  onClick: () => go('/archive') },
    { label: 'Export a backup',    icon: Download, onClick: () => go('/settings?action=export') },
  ]

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left',
          'hover:bg-ink-800 active:bg-ink-800/70',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-600',
          'transition-all duration-150',
          open && 'bg-ink-800',
        )}
      >
        <Avatar user={user} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-ink-100 truncate">
            {user?.displayName?.split(' ')[0] || 'Account'}
          </span>
          <span className="block text-xs text-ink-500 truncate">{user?.email}</span>
        </span>
        <ChevronsUpDown size={14} className="text-ink-500 shrink-0" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="absolute bottom-full left-0 right-0 mb-2 z-50
                       bg-white rounded-2xl shadow-float overflow-hidden py-2"
          >
            <div className="px-4 py-3 border-b border-ink-100 flex items-center gap-3">
              <Avatar user={user} size={36} />
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink-900 truncate">
                  {user?.displayName || 'Account'}
                </div>
                <div className="text-xs text-ink-400 truncate">{user?.email}</div>
              </div>
            </div>

            <div className="py-1">
              {items.map(({ label, icon: Icon, onClick }) => (
                <button
                  key={label}
                  role="menuitem"
                  onClick={onClick}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700
                             hover:bg-ink-50 active:bg-ink-100
                             focus-visible:outline-none focus-visible:bg-ink-50
                             transition-colors duration-120"
                >
                  <Icon size={15} className="text-ink-400 shrink-0" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>

            <div className="pt-1 border-t border-ink-100">
              <button
                role="menuitem"
                onClick={() => { setOpen(false); logout() }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600
                           hover:bg-rose-50 active:bg-rose-100
                           focus-visible:outline-none focus-visible:bg-rose-50
                           transition-colors duration-120"
              >
                <LogOut size={15} className="shrink-0" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { Avatar }
