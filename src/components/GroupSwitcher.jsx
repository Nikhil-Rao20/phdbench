// src/components/GroupSwitcher.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Which shared board you are looking at.
//
// Placed at the top of the sidebar, above the navigation, because it changes the
// meaning of everything below it. A lead only exists inside a group; if you
// cannot see which group is selected, you cannot tell whose board you are
// reading — and with two groups open in two tabs, that ambiguity is how a lead
// gets added to the wrong one.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, ChevronsUpDown, Check, Plus, Settings2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGroups } from '../hooks/useGroups'
import { useAuth } from '../hooks/useAuth'
import { isGroupAdmin } from '../lib/access'
import { cn } from './ui'

export default function GroupSwitcher({ onNavigate }) {
  const { groups, active, switchGroup, groupsLoading } = useGroups()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
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

  if (groupsLoading) {
    return <div className="h-[52px] rounded-xl bg-ink-800/40 animate-shimmer mb-3" aria-hidden="true" />
  }

  // No group yet is a real state, not an error — it is where every new account
  // starts, and it needs to lead somewhere rather than show an empty box.
  if (!active) {
    return (
      <button
        onClick={() => go('/groups')}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 mb-3 rounded-xl
                   border border-dashed border-ink-700 text-ink-300
                   hover:border-ink-500 hover:text-white
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400
                   transition-colors duration-150"
      >
        <Plus size={15} aria-hidden="true" />
        <span className="text-sm">Create a group</span>
      </button>
    )
  }

  const memberCount = (active.memberEmails || []).length

  return (
    <div ref={ref} className="relative mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                   bg-ink-900 hover:bg-ink-800 text-left
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400
                   transition-colors duration-150"
      >
        <span className="w-7 h-7 rounded-lg bg-sage-600/20 text-sage-300 flex items-center
                         justify-center shrink-0">
          <Users size={14} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-white truncate leading-tight">{active.name}</span>
          <span className="block text-xs text-ink-500">
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </span>
        </span>
        <ChevronsUpDown size={14} className="text-ink-500 shrink-0" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.1 } }}
            transition={{ type: 'spring', stiffness: 460, damping: 32 }}
            role="listbox"
            className="absolute z-50 left-0 right-0 mt-1.5 p-1.5 rounded-xl
                       bg-ink-900 ring-1 ring-ink-700 shadow-float"
          >
            <div className="max-h-64 overflow-y-auto">
              {groups.map(group => {
                const selected = group.id === active.id
                return (
                  <button
                    key={group.id}
                    role="option"
                    aria-selected={selected}
                    onClick={() => { switchGroup(group.id); setOpen(false); onNavigate?.() }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left',
                      'transition-colors duration-120',
                      selected ? 'bg-ink-800 text-white' : 'text-ink-300 hover:bg-ink-800/60 hover:text-white',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm truncate">{group.name}</span>
                      <span className="block text-xs text-ink-500">
                        {(group.memberEmails || []).length} members
                        {isGroupAdmin(group, user) && ' · you run this'}
                      </span>
                    </span>
                    {selected && <Check size={14} className="text-sage-400 shrink-0" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>

            <div className="border-t border-ink-800 mt-1.5 pt-1.5 space-y-0.5">
              <button
                onClick={() => go('/groups')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left
                           text-ink-300 hover:bg-ink-800/60 hover:text-white
                           transition-colors duration-120"
              >
                <Settings2 size={14} aria-hidden="true" />
                <span className="text-sm">Manage groups</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
