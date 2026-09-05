// src/components/AttentionPanel.jsx
// The loud in-app reminder layer.
//
// Charter #7 (hierarchy) and #10 (colour with a job): this is the single most
// important thing on the dashboard, so it sits at the top, and severity is
// carried by colour *and* icon *and* wording — never colour alone.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, AlertCircle, Info, ChevronDown, CheckCircle2, ArrowRight,
} from 'lucide-react'
import { SEVERITY } from '../lib/attention'
import { cn, Badge } from './ui'

const SEVERITY_META = {
  [SEVERITY.CRITICAL]: {
    icon: AlertTriangle,
    label: 'Needs action now',
    iconClass: 'text-rose-600',
    chipClass: 'bg-rose-50 text-rose-700 ring-rose-200',
    accent: 'bg-rose-500',
  },
  [SEVERITY.WARNING]: {
    icon: AlertCircle,
    label: 'Coming up',
    iconClass: 'text-amber-600',
    chipClass: 'bg-amber-50 text-amber-800 ring-amber-200',
    accent: 'bg-amber-400',
  },
  [SEVERITY.INFO]: {
    icon: Info,
    label: 'Worth a look',
    iconClass: 'text-sky-600',
    chipClass: 'bg-sky-50 text-sky-700 ring-sky-200',
    accent: 'bg-sky-400',
  },
}

const INITIAL_VISIBLE = 5

function AttentionRow({ item, index, onOpen }) {
  const meta = SEVERITY_META[item.severity]
  const Icon = meta.icon

  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.2 }}
      onClick={() => onOpen(item)}
      className="group w-full text-left flex items-start gap-3 p-3 rounded-xl
                 hover:bg-ink-50 active:bg-ink-100
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-300
                 transition-colors duration-120"
    >
      <span className={cn('mt-0.5 shrink-0', meta.iconClass)}>
        <Icon size={15} aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm text-ink-800 leading-snug">{item.title}</span>
        {item.detail && (
          <span className="block text-xs text-ink-500 mt-1 leading-relaxed">{item.detail}</span>
        )}
      </span>

      <span className="shrink-0 self-center flex items-center gap-1 text-xs text-ink-400
                       opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100
                       transition-opacity duration-120">
        {item.action}
        <ArrowRight size={12} aria-hidden="true" />
      </span>
    </motion.button>
  )
}

const STORAGE_KEY = 'phdbench:attention-open'

/**
 * Whether the panel starts open.
 *
 * A wall of warnings as the first thing you see every single time is
 * oppressive, so the panel is a collapsed summary by default. The exception is
 * genuinely urgent items — if something cannot wait, it opens itself. A manual
 * choice is remembered and wins over both.
 */
function useInitialOpen(hasCritical) {
  return useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'open') return true
      if (stored === 'closed') return false
    } catch {
      // Private browsing and blocked site data both throw here.
    }
    return hasCritical
  })
}

export default function AttentionPanel({ items, counts, onOpenApplication }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [open, setOpen] = useInitialOpen(counts.critical > 0)

  const toggle = () => {
    setOpen(o => {
      const next = !o
      try { localStorage.setItem(STORAGE_KEY, next ? 'open' : 'closed') } catch { /* ignore */ }
      return next
    })
  }

  const handleOpen = (item) => {
    if (item.appId && onOpenApplication) {
      onOpenApplication(item.appId)
      return
    }
    navigate(item.href || '/')
  }

  // Charter #12: "nothing needs attention" is a real, earned state and deserves
  // to feel like one, rather than looking like the panel failed to load.
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-sage-200 shadow-surface p-5">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-sage-50 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-sage-600" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-lg text-ink-900 leading-tight">Nothing needs you right now</h2>
            <p className="text-sm text-ink-500 mt-0.5">
              No approaching deadlines, no outstanding letters, no lapsing scores.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const visible = expanded ? items : items.slice(0, INITIAL_VISIBLE)
  const hidden = items.length - visible.length

  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-raised overflow-hidden">
      {/* A severity stripe, so urgency registers before a single word is read. */}
      <div className="flex h-1">
        {[SEVERITY.CRITICAL, SEVERITY.WARNING, SEVERITY.INFO].map(sev => {
          const count = counts[sev === SEVERITY.CRITICAL ? 'critical' : sev === SEVERITY.WARNING ? 'warning' : 'info']
          if (!count) return null
          return (
            <div
              key={sev}
              className={SEVERITY_META[sev].accent}
              style={{ flexGrow: count }}
              aria-hidden="true"
            />
          )
        })}
      </div>

      {/* The summary row is always visible, so collapsing hides the detail but
          never the fact that something needs doing. */}
      <button
        onClick={toggle}
        aria-expanded={open}
        aria-controls="attention-items"
        className="w-full flex items-center gap-3 p-4 sm:p-5 text-left
                   hover:bg-ink-50/60 active:bg-ink-50
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset
                   focus-visible:ring-ink-300 transition-colors duration-120"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2 flex-wrap">
            <span className="font-display text-lg text-ink-900 leading-tight">
              Needs your attention
            </span>
            <span className="text-sm text-ink-400 tabular-nums">{items.length}</span>
          </span>
          <span className="block text-sm text-ink-500 mt-0.5">
            {counts.critical > 0
              ? `${counts.critical} thing${counts.critical > 1 ? 's' : ''} cannot wait.`
              : 'Nothing urgent, but these are moving.'}
          </span>
        </span>

        <span className="flex flex-wrap gap-1.5 justify-end shrink-0">
          {counts.critical > 0 && (
            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ring-1', SEVERITY_META[SEVERITY.CRITICAL].chipClass)}>
              <AlertTriangle size={11} aria-hidden="true" /> {counts.critical}
            </span>
          )}
          {counts.warning > 0 && (
            <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ring-1', SEVERITY_META[SEVERITY.WARNING].chipClass)}>
              {counts.warning}
            </span>
          )}
          {counts.info > 0 && (
            <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ring-1', SEVERITY_META[SEVERITY.INFO].chipClass)}>
              {counts.info}
            </span>
          )}
        </span>

        <ChevronDown
          size={17}
          className={cn('shrink-0 text-ink-400 transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="attention-items"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-ink-100">
              <div className="space-y-0.5 -mx-1 mt-2">
                {visible.map((item, i) => (
                  <AttentionRow key={item.id} item={item} index={i} onOpen={handleOpen} />
                ))}
              </div>

              {hidden > 0 && (
                <button
                  onClick={() => setExpanded(true)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg
                             text-xs text-ink-500 hover:text-ink-800 hover:bg-ink-50
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-300
                             transition-colors duration-120"
                >
                  <ChevronDown size={13} aria-hidden="true" />
                  Show {hidden} more
                </button>
              )}

              {expanded && items.length > INITIAL_VISIBLE && (
                <button
                  onClick={() => setExpanded(false)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg
                             text-xs text-ink-500 hover:text-ink-800 hover:bg-ink-50
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-300
                             transition-colors duration-120"
                >
                  <ChevronDown size={13} className="rotate-180" aria-hidden="true" />
                  Show less
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
