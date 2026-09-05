import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, FileText, Search, X, Pencil, Archive as ArchiveIcon,
  ExternalLink, SlidersHorizontal, CheckCircle2,
} from 'lucide-react'
import { useData, useUid } from '../hooks/useData'
import { useToast, useMutation } from '../hooks/useToast'
import {
  addApplication, updateApplication, archiveApplication,
  restoreApplication, clearNeedsReview,
} from '../lib/db'
import { STAGE, STAGES, STAGE_ORDER, PRIORITIES, PREPARING_STAGES, SUBMITTED_STAGES } from '../lib/model'
import Modal from '../components/Modal'
import ApplicationForm from '../components/ApplicationForm'
import ApplicationDetailPanel from '../components/ApplicationDetailPanel'
import { CardGridSkeleton } from '../components/Skeleton'
import { Button, EmptyState, Tooltip, Badge, cn } from '../components/ui'
import {
  StageBadge, PriorityBadge, FitScore, DeadlineDisplay, CountryChip,
  DocsProgress, LorSummary, FeeDisplay, feeInINR,
} from '../components/domain'
import { Input, Select } from '../components/form'

const GROUPS = [
  { value: 'all',       label: 'All' },
  { value: 'preparing', label: 'In preparation' },
  { value: 'sent',      label: 'Sent' },
  { value: 'decided',   label: 'Decided' },
]

function ApplicationCard({ app, documents, index, cycleTotalINR, onOpen, onEdit, onArchive, onConfirmReview }) {
  const meta = STAGES[app.stage]

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index * 0.03, 0.15), duration: 0.25 }}
      className={cn(
        'group bg-white rounded-2xl border shadow-surface hover:shadow-raised',
        'p-5 flex flex-col gap-3 cursor-pointer transition-all duration-200',
        app.stage === STAGE.OFFER ? 'border-green-200 bg-green-50/30' : 'border-ink-100 hover:border-ink-200',
        [STAGE.REJECTED, STAGE.WITHDRAWN, STAGE.MISSED_DEADLINE].includes(app.stage) && 'opacity-60',
      )}
      onClick={() => onOpen(app.id)}
    >
      {/* Migrated records say plainly that nothing was guessed about them. */}
      {app.needsReview && (
        <div
          className="flex items-start gap-2 p-2.5 -m-1 mb-1 rounded-lg bg-sky-50 border border-sky-200"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-xs text-sky-900 flex-1 leading-relaxed">
            Migrated from the old format — is this really <strong>{meta?.label}</strong>?
          </p>
          <button
            onClick={() => onConfirmReview(app)}
            className="shrink-0 text-xs text-sky-700 font-medium hover:underline"
          >
            Yes
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium text-ink-900 text-sm leading-snug truncate">{app.university}</h3>
          <p className="text-ink-500 text-xs truncate mt-0.5">
            {app.labName || app.department || '—'}
          </p>
        </div>
        <StageBadge stage={app.stage} short />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-600">
        {app.professor && <span className="truncate max-w-[12rem]">👤 {app.professor}</span>}
        {app.country && <CountryChip code={app.country} />}
        {app.priority && <PriorityBadge priority={app.priority} />}
        {app.fitScore > 0 && <FitScore score={app.fitScore} />}
      </div>

      <DocsProgress app={app} documents={documents} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <LorSummary app={app} />
        {app.fee && Number(app.fee.amount) > 0 && (
          <FeeDisplay fee={app.fee} cycleTotalINR={cycleTotalINR} />
        )}
      </div>

      {app.deadline && <DeadlineDisplay value={app.deadline} label="Deadline" />}

      <div
        className="flex items-center gap-1.5 pt-3 border-t border-ink-100"
        onClick={e => e.stopPropagation()}
      >
        {app.appUrl && (
          <Tooltip label="Open the application portal">
            <a href={app.appUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs
                         text-ink-500 hover:bg-ink-100 hover:text-ink-800 transition-colors duration-120">
              <ExternalLink size={12} aria-hidden="true" /> Portal
            </a>
          </Tooltip>
        )}
        <div className="flex-1" />
        <Tooltip label="Edit">
          <button onClick={() => onEdit(app)} aria-label="Edit application"
            className="p-2 rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700
                       active:scale-90 transition-all duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400">
            <Pencil size={14} aria-hidden="true" />
          </button>
        </Tooltip>
        <Tooltip label="Archive — reversible">
          <button onClick={() => onArchive(app)} aria-label="Archive application"
            className="p-2 rounded-lg text-ink-400 hover:bg-rose-50 hover:text-rose-600
                       active:scale-90 transition-all duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">
            <ArchiveIcon size={14} aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    </motion.article>
  )
}

export default function ApplicationsPage() {
  const uid = useUid()
  const { loading, applications, documents } = useData()
  const toast = useToast()
  const mutate = useMutation()
  const [searchParams, setSearchParams] = useSearchParams()

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('all')
  const [stageFilter, setStageFilter] = useState('')
  const [sort, setSort] = useState('deadline')

  // The dashboard links straight to a specific application.
  const openId = searchParams.get('open')
  const setOpenId = (id) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('open', id); else next.delete('open')
    setSearchParams(next, { replace: true })
  }

  const cycleTotalINR = useMemo(
    () => applications.reduce((sum, a) => sum + (a.fee?.waiverGranted ? 0 : feeInINR(a.fee)), 0),
    [applications],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return applications
      .filter(a => {
        if (group === 'preparing') return PREPARING_STAGES.includes(a.stage)
        if (group === 'sent') return SUBMITTED_STAGES.includes(a.stage)
        if (group === 'decided') return STAGES[a.stage]?.group === 'decided'
        return true
      })
      .filter(a => !stageFilter || a.stage === stageFilter)
      .filter(a => !q || [a.university, a.labName, a.professor, a.department, a.researchArea]
        .some(s => s?.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (sort === 'deadline') {
          const da = a.deadline ? new Date(a.deadline.date || a.deadline).getTime() : Infinity
          const dbb = b.deadline ? new Date(b.deadline.date || b.deadline).getTime() : Infinity
          return da - dbb
        }
        if (sort === 'priority') {
          return (PRIORITIES[a.priority]?.order ?? 9) - (PRIORITIES[b.priority]?.order ?? 9)
        }
        if (sort === 'stage') {
          return (STAGES[a.stage]?.order ?? 999) - (STAGES[b.stage]?.order ?? 999)
        }
        return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
      })
  }, [applications, group, stageFilter, search, sort])

  const handleAdd = async (data) => {
    setSaving(true)
    const r = await mutate(() => addApplication(uid, data), {
      success: `Added ${data.university}.`,
      failure: 'Could not add that application.',
    })
    setSaving(false)
    if (r.ok) setAddOpen(false)
  }

  const handleEdit = async (data) => {
    setSaving(true)
    const r = await mutate(() => updateApplication(uid, editTarget.id, data), {
      success: 'Saved.',
      failure: 'Could not save your changes.',
    })
    setSaving(false)
    if (r.ok) setEditTarget(null)
  }

  const handleArchive = async (app) => {
    const r = await mutate(() => archiveApplication(uid, app.id), {
      failure: 'Could not archive that application.',
    })
    if (!r.ok) return
    if (openId === app.id) setOpenId(null)
    toast.undo(
      `${app.university} archived.`,
      () => mutate(() => restoreApplication(uid, app.id), { success: 'Restored.' }),
      { key: `archive-${app.id}` },
    )
  }

  const handleConfirmReview = (app) =>
    mutate(() => clearNeedsReview(uid, app.id), { success: 'Confirmed.' })

  const preparingCount = applications.filter(a => PREPARING_STAGES.includes(a.stage)).length
  const sentCount = applications.filter(a => SUBMITTED_STAGES.includes(a.stage)).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink-900">Applications</h1>
          <p className="text-ink-500 text-sm mt-1">
            {preparingCount} in preparation · {sentCount} sent · {applications.length} total
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setAddOpen(true)}>
          Add application
        </Button>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" aria-hidden="true" />
          <Input
            className="pl-9 pr-9" placeholder="Search university, lab, professor…"
            value={search} onChange={e => setSearch(e.target.value)}
            aria-label="Search applications"
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700">
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {GROUPS.map(g => (
            <button
              key={g.value}
              onClick={() => { setGroup(g.value); setStageFilter('') }}
              aria-pressed={group === g.value}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 active:scale-[0.97]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400',
                group === g.value
                  ? 'bg-ink-900 text-white shadow-surface'
                  : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50',
              )}
            >
              {g.label}
            </button>
          ))}

          <span className="w-px self-stretch bg-ink-200 mx-1" aria-hidden="true" />

          <Select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
            aria-label="Filter by stage" className="w-auto text-xs py-1.5">
            <option value="">Any stage</option>
            {STAGE_ORDER.map(s => <option key={s} value={s}>{STAGES[s].label}</option>)}
          </Select>

          <Select value={sort} onChange={e => setSort(e.target.value)}
            aria-label="Sort by" className="w-auto text-xs py-1.5">
            <option value="deadline">Soonest deadline</option>
            <option value="priority">Priority</option>
            <option value="stage">Stage</option>
            <option value="created">Recently added</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <CardGridSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={applications.length === 0 ? 'No applications yet' : 'Nothing matches'}
          description={
            applications.length === 0
              ? 'Add one directly, or convert a lead you have already saved. New applications start as "Not started" — they only count as sent once you say so.'
              : 'Try a different search, or widen the filters above.'
          }
          action={
            applications.length === 0
              ? <Button variant="primary" icon={Plus} onClick={() => setAddOpen(true)}>Add your first application</Button>
              : <Button variant="secondary" onClick={() => { setSearch(''); setGroup('all'); setStageFilter('') }}>Clear filters</Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((app, i) => (
              <ApplicationCard
                key={app.id}
                app={app}
                documents={documents}
                index={i}
                cycleTotalINR={cycleTotalINR}
                onOpen={setOpenId}
                onEdit={setEditTarget}
                onArchive={handleArchive}
                onConfirmReview={handleConfirmReview}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {openId && (
        <ApplicationDetailPanel
          appId={openId}
          uid={uid}
          onClose={() => setOpenId(null)}
          onEdit={() => {
            const app = applications.find(a => a.id === openId)
            setOpenId(null)
            setEditTarget(app)
          }}
        />
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} wide confirmClose
        title="Add an application"
        description="It starts as “Not started” — mark it submitted only once it has actually gone.">
        <ApplicationForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} loading={saving} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} wide confirmClose
        title="Edit application">
        {editTarget && (
          <ApplicationForm initial={editTarget} onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)} loading={saving} />
        )}
      </Modal>
    </div>
  )
}
