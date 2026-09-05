// src/components/CommandPalette.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Cmd/Ctrl+K search across everything, plus the actions you reach for most.
//
// The point is speed: from anywhere, two keystrokes and a few letters should
// land you on the right application. Search covers university, lab, professor,
// department, research area and notes, because you do not always remember a
// record by its title.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search, FileText, Lightbulb, CornerDownLeft, ArrowUp, ArrowDown,
  LayoutDashboard, CalendarClock, BarChart3, Settings, Archive, Plus,
} from 'lucide-react'
import { useData } from '../hooks/useData'
import { STAGES, LEAD_STATES } from '../lib/model'
import { cn } from './ui'

const NAV_COMMANDS = [
  { id: 'nav-dashboard',    label: 'Dashboard',        icon: LayoutDashboard, path: '/',             keywords: 'home overview' },
  { id: 'nav-leads',        label: 'Leads',            icon: Lightbulb,       path: '/leads',        keywords: 'saved positions' },
  { id: 'nav-applications', label: 'Applications',     icon: FileText,        path: '/applications', keywords: 'apps' },
  { id: 'nav-deadlines',    label: 'Deadlines',        icon: CalendarClock,   path: '/deadlines',    keywords: 'dates due calendar' },
  { id: 'nav-stats',        label: 'Stats',            icon: BarChart3,       path: '/stats',        keywords: 'analytics numbers' },
  { id: 'nav-settings',     label: 'Settings',         icon: Settings,        path: '/settings',     keywords: 'profile documents recommenders scores backup' },
  { id: 'nav-archive',      label: 'Archive',          icon: Archive,         path: '/archive',      keywords: 'deleted removed restore' },
]

const MAX_PER_GROUP = 6

function score(haystack, query) {
  if (!haystack) return 0
  const text = haystack.toLowerCase()
  if (text === query) return 100
  if (text.startsWith(query)) return 80
  if (text.includes(query)) return 50
  return 0
}

export default function CommandPalette() {
  const navigate = useNavigate()
  const { applications, leads } = useData()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Cmd+K / Ctrl+K anywhere, and the mobile top bar dispatches the same event.
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        return
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    const onOpenEvent = () => setOpen(true)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('phdbench:open-search', onOpenEvent)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('phdbench:open-search', onOpenEvent)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()

    const apps = applications
      .map(a => ({
        record: a,
        kind: 'application',
        rank: Math.max(
          score(a.university, q) + 10, // the field you are most likely aiming at
          score(a.labName, q),
          score(a.professor, q),
          score(a.department, q),
          score(a.researchArea, q),
          score(a.whyThisLab, q) - 20,
        ),
      }))
      .filter(r => !q || r.rank > 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, MAX_PER_GROUP)

    const leadHits = leads
      .map(l => ({
        record: l,
        kind: 'lead',
        rank: Math.max(
          score(l.university, q) + 10,
          score(l.labName, q),
          score(l.professor, q),
          score(l.researchArea, q),
          score(l.notes, q) - 20,
        ),
      }))
      .filter(r => !q || r.rank > 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, MAX_PER_GROUP)

    const commands = NAV_COMMANDS
      .filter(c => !q || score(c.label, q) > 0 || score(c.keywords, q) > 0)
      .slice(0, MAX_PER_GROUP)

    const groups = []
    if (apps.length) groups.push({ label: 'Applications', items: apps })
    if (leadHits.length) groups.push({ label: 'Leads', items: leadHits })
    if (commands.length) groups.push({ label: 'Go to', items: commands.map(c => ({ command: c, kind: 'command', rank: 0 })) })
    return groups
  }, [query, applications, leads])

  // Flattened, because arrow keys move through everything regardless of group.
  const flat = useMemo(() => results.flatMap(g => g.items), [results])

  useEffect(() => { setActive(0) }, [query])

  const run = (item) => {
    setOpen(false)
    if (item.kind === 'command') navigate(item.command.path)
    else if (item.kind === 'application') navigate(`/applications?open=${item.record.id}`)
    else navigate('/leads')
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' && flat[active]) { e.preventDefault(); run(flat[active]) }
  }

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [active])

  let flatIndex = -1

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 sm:pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-[3px]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <motion.div
            role="dialog" aria-modal="true" aria-label="Search"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="relative w-full max-w-xl bg-white rounded-2xl shadow-float overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 border-b border-ink-100">
              <Search size={17} className="text-ink-400 shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search universities, labs, professors, notes…"
                aria-label="Search"
                className="flex-1 py-4 bg-transparent text-ink-900 placeholder-ink-400
                           text-sm focus:outline-none"
              />
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded
                              bg-ink-100 text-ink-400 text-2xs font-mono shrink-0">
                esc
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
              {flat.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm text-ink-500">Nothing matches “{query}”.</p>
                  <p className="text-xs text-ink-400 mt-1">
                    Search covers university, lab, professor, department, area and notes.
                  </p>
                </div>
              ) : (
                results.map(group => (
                  <div key={group.label} className="mb-1">
                    <div className="px-4 py-1.5 text-2xs font-semibold text-ink-400 uppercase tracking-widest">
                      {group.label}
                    </div>
                    {group.items.map(item => {
                      flatIndex++
                      const isActive = flatIndex === active
                      const index = flatIndex

                      if (item.kind === 'command') {
                        const Icon = item.command.icon
                        return (
                          <button
                            key={item.command.id}
                            data-active={isActive}
                            onMouseMove={() => setActive(index)}
                            onClick={() => run(item)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100',
                              isActive ? 'bg-ink-100' : 'hover:bg-ink-50',
                            )}
                          >
                            <Icon size={15} className="text-ink-400 shrink-0" aria-hidden="true" />
                            <span className="text-sm text-ink-800">{item.command.label}</span>
                          </button>
                        )
                      }

                      const r = item.record
                      const isApp = item.kind === 'application'
                      const stageLabel = isApp
                        ? STAGES[r.stage]?.short
                        : LEAD_STATES[r.state || 'active']?.label

                      return (
                        <button
                          key={`${item.kind}-${r.id}`}
                          data-active={isActive}
                          onMouseMove={() => setActive(index)}
                          onClick={() => run(item)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100',
                            isActive ? 'bg-ink-100' : 'hover:bg-ink-50',
                          )}
                        >
                          {isApp
                            ? <FileText size={15} className="text-ink-400 shrink-0" aria-hidden="true" />
                            : <Lightbulb size={15} className="text-ink-400 shrink-0" aria-hidden="true" />}
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm text-ink-800 truncate">{r.university}</span>
                            <span className="block text-xs text-ink-400 truncate">
                              {[r.labName, r.professor].filter(Boolean).join(' · ') || '—'}
                            </span>
                          </span>
                          {stageLabel && (
                            <span className="text-2xs text-ink-400 shrink-0">{stageLabel}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Charter #6: the keyboard model is stated rather than assumed. */}
            <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 border-t border-ink-100
                            text-2xs text-ink-400">
              <span className="inline-flex items-center gap-1">
                <ArrowUp size={10} aria-hidden="true" /><ArrowDown size={10} aria-hidden="true" /> navigate
              </span>
              <span className="inline-flex items-center gap-1">
                <CornerDownLeft size={10} aria-hidden="true" /> open
              </span>
              <span className="ml-auto inline-flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-ink-100 font-mono">⌘K</kbd> to reopen
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
