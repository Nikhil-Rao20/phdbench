import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Archive as ArchiveIcon, RotateCcw, Trash2, ShieldAlert } from 'lucide-react'
import { useData, useUid } from '../hooks/useData'
import { useToast, useMutation } from '../hooks/useToast'
import {
  restoreLead, destroyLead, restoreApplication, destroyApplication,
} from '../lib/db'
import { StageBadge, LeadStateBadge } from '../components/domain'
import { Button, EmptyState, cn } from '../components/ui'

const HOLD_MS = 1400

/**
 * Hold-to-delete.
 *
 * Everywhere else in this app, safety comes from undo — it costs nothing until
 * you actually make a mistake. This is the one action undo cannot cover, so it
 * is the one place deliberate friction is worth it. A hold is also a better fit
 * than type-to-confirm here: no keyboard, no copying a name, but impossible to
 * trigger by a stray click.
 */
function HoldToDelete({ onConfirm, label = 'Hold to delete forever' }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef(null)

  const start = () => {
    setHolding(true)
    timer.current = setTimeout(() => {
      setHolding(false)
      onConfirm()
    }, HOLD_MS)
  }

  const cancel = () => {
    setHolding(false)
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
  }

  return (
    <button
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      title={label}
      aria-label={label}
      className="relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200
                 hover:bg-rose-100 select-none touch-none
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400
                 transition-colors duration-150"
    >
      <motion.span
        className="absolute inset-y-0 left-0 bg-rose-500/25"
        initial={{ width: '0%' }}
        animate={{ width: holding ? '100%' : '0%' }}
        transition={{ duration: holding ? HOLD_MS / 1000 : 0.15, ease: 'linear' }}
        aria-hidden="true"
      />
      <Trash2 size={12} className="relative z-10" aria-hidden="true" />
      <span className="relative z-10">{holding ? 'Keep holding…' : 'Delete forever'}</span>
    </button>
  )
}

function ArchiveRow({ record, kind, onRestore, onDestroy }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-white rounded-2xl border border-ink-100 shadow-surface p-4
                 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-ink-900 text-sm truncate">{record.university}</span>
          <span className="text-2xs uppercase tracking-wider text-ink-400">{kind}</span>
        </div>
        <p className="text-xs text-ink-500 mt-0.5 truncate">
          {[record.labName, record.professor].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>

      <div className="shrink-0">
        {kind === 'application'
          ? <StageBadge stage={record.stage} short />
          : <LeadStateBadge state={record.state || 'active'} />}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => onRestore(record)}>
          Restore
        </Button>
        <HoldToDelete onConfirm={() => onDestroy(record)} />
      </div>
    </motion.li>
  )
}

export default function ArchivePage() {
  const uid = useUid()
  const { archivedLeads, archivedApplications } = useData()
  const toast = useToast()
  const mutate = useMutation()

  const items = useMemo(() => [
    ...archivedApplications.map(r => ({ record: r, kind: 'application' })),
    ...archivedLeads.map(r => ({ record: r, kind: 'lead' })),
  ].sort((a, b) => (b.record.archivedAt?.seconds ?? 0) - (a.record.archivedAt?.seconds ?? 0)),
  [archivedApplications, archivedLeads])

  const handleRestore = (record, kind) =>
    mutate(
      () => (kind === 'application' ? restoreApplication(uid, record.id) : restoreLead(uid, record.id)),
      { success: `${record.university} restored.`, failure: 'Could not restore that.' },
    )

  const handleDestroy = (record, kind) =>
    mutate(
      () => (kind === 'application' ? destroyApplication(uid, record.id) : destroyLead(uid, record.id)),
      { success: `${record.university} deleted permanently.`, failure: 'Could not delete that.' },
    )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink-900">Archive</h1>
        <p className="text-ink-500 text-sm mt-1 max-w-prose leading-relaxed">
          Nothing here is gone. Archiving hides a record from your lists while keeping
          it whole — restore it any time.
        </p>
      </div>

      {items.length > 0 && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
          <ShieldAlert size={15} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-amber-900 leading-relaxed">
            <strong>Delete forever</strong> is the only irreversible action in PhDBench.
            It removes the record and everything attached to it — follow-ups, activity
            log, the lot. Hold the button to confirm.
          </p>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={ArchiveIcon}
          title="Nothing archived"
          description="When you archive a lead or an application it lands here rather than being deleted, so a misclick can never cost you anything."
        />
      ) : (
        <ul className="space-y-2">
          <AnimatePresence mode="popLayout">
            {items.map(({ record, kind }) => (
              <ArchiveRow
                key={`${kind}-${record.id}`}
                record={record}
                kind={kind}
                onRestore={r => handleRestore(r, kind)}
                onDestroy={r => handleDestroy(r, kind)}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
