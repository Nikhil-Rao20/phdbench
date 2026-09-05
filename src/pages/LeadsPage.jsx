import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Lightbulb, ExternalLink, Pencil, Archive as ArchiveIcon,
  ArrowUpRight, Search, X, ThumbsDown, CalendarX,
} from 'lucide-react'
import { useData, useUid } from '../hooks/useData'
import { useToast, useMutation } from '../hooks/useToast'
import {
  addLead, updateLead, archiveLead, restoreLead,
  setLeadState, promoteLeadToApplication,
} from '../lib/db'
import { LEAD_STATE, PRIORITIES, STAGE } from '../lib/model'
import { isOverdue } from '../lib/datetime'
import Modal from '../components/Modal'
import LeadForm from '../components/LeadForm'
import { CardGridSkeleton } from '../components/Skeleton'
import { Button, EmptyState, Tooltip, Badge, cn } from '../components/ui'
import {
  LeadStateBadge, PriorityBadge, DeadlineDisplay, CountryChip, UrgencyDot,
} from '../components/domain'
import { Field, Input, Segmented, DeadlineInput, TextArea } from '../components/form'

const FILTERS = [
  { value: 'active',    label: 'Active' },
  { value: 'all',       label: 'All' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed',    label: 'Ruled out' },
]

function LeadCard({ lead, index, onEdit, onConvert, onArchive, onTriage }) {
  const expired = lead.deadline && isOverdue(lead.deadline)
  const converted = lead.state === LEAD_STATE.CONVERTED

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index * 0.03, 0.15), duration: 0.25 }}
      className={cn(
        'group bg-white rounded-2xl border shadow-surface hover:shadow-raised p-5',
        'flex flex-col gap-3 transition-all duration-200',
        converted ? 'border-sage-200 bg-sage-50/30' : 'border-ink-100 hover:border-ink-200',
        (lead.state === LEAD_STATE.NOT_INTERESTED || lead.state === LEAD_STATE.EXPIRED) && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium text-ink-900 text-sm leading-snug truncate">{lead.university}</h3>
          <p className="text-ink-500 text-xs truncate mt-0.5">{lead.labName || '—'}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <LeadStateBadge state={lead.state || LEAD_STATE.ACTIVE} />
          {lead.priority && <PriorityBadge priority={lead.priority} />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-600">
        <span className="truncate max-w-[14rem]">👤 {lead.professor}</span>
        {lead.researchArea && <span className="text-ink-500">🔬 {lead.researchArea}</span>}
        {lead.country && <CountryChip code={lead.country} />}
      </div>

      {lead.fundingNote && (
        <p className="text-xs text-sage-700 bg-sage-50 rounded-lg px-2.5 py-1.5 truncate">
          💰 {lead.fundingNote}
        </p>
      )}

      {lead.notes && (
        <p className="text-xs text-ink-500 line-clamp-2 bg-ink-50 rounded-lg p-2.5 leading-relaxed">
          {lead.notes}
        </p>
      )}

      {(lead.startDate || lead.deadline) && (
        <div className="space-y-2 pt-1">
          {lead.startDate && !isOverdue(lead.startDate) && (
            <div className="flex items-center gap-2">
              <UrgencyDot value={lead.startDate} kind="opens" />
              <span className="text-xs text-ink-500">Opens</span>
              <span className="ml-auto"><DeadlineDisplay value={lead.startDate} kind="opens" compact /></span>
            </div>
          )}
          {lead.deadline && <DeadlineDisplay value={lead.deadline} label="Deadline" />}
        </div>
      )}

      <div className="flex gap-3 text-xs">
        {lead.labUrl && (
          <a href={lead.labUrl} target="_blank" rel="noreferrer"
            className="text-sage-700 hover:underline inline-flex items-center gap-1">
            <ExternalLink size={11} aria-hidden="true" /> Lab
          </a>
        )}
        {lead.linkedinPost && (
          <a href={lead.linkedinPost} target="_blank" rel="noreferrer"
            className="text-sky-600 hover:underline inline-flex items-center gap-1">
            <ExternalLink size={11} aria-hidden="true" /> Post
          </a>
        )}
        {lead.source && <span className="text-ink-400 ml-auto">via {lead.source}</span>}
      </div>

      <div className="flex items-center gap-1.5 pt-3 border-t border-ink-100">
        {!converted ? (
          <Button size="sm" variant="primary" icon={ArrowUpRight}
            onClick={() => onConvert(lead)} className="flex-1">
            Apply to this
          </Button>
        ) : (
          <span className="flex-1 text-xs text-sage-700">✓ Converted to an application</span>
        )}

        {!converted && (lead.state || 'active') === 'active' && (
          <Tooltip label={expired ? 'Mark the window as closed' : 'Not interested'}>
            <button
              onClick={() => onTriage(lead, expired ? LEAD_STATE.EXPIRED : LEAD_STATE.NOT_INTERESTED)}
              aria-label={expired ? 'Mark as passed' : 'Mark as not interested'}
              className="p-2 rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700
                         active:scale-90 transition-all duration-150
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400"
            >
              {expired ? <CalendarX size={14} aria-hidden="true" /> : <ThumbsDown size={14} aria-hidden="true" />}
            </button>
          </Tooltip>
        )}

        <Tooltip label="Edit">
          <button
            onClick={() => onEdit(lead)}
            aria-label="Edit lead"
            className="p-2 rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700
                       active:scale-90 transition-all duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400"
          >
            <Pencil size={14} aria-hidden="true" />
          </button>
        </Tooltip>

        <Tooltip label="Archive — reversible">
          <button
            onClick={() => onArchive(lead)}
            aria-label="Archive lead"
            className="p-2 rounded-lg text-ink-400 hover:bg-rose-50 hover:text-rose-600
                       active:scale-90 transition-all duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            <ArchiveIcon size={14} aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    </motion.article>
  )
}

function ConvertForm({ lead, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    applicationType: 'portal',
    startDate: lead.startDate || null,
    deadline: lead.deadline || null,
    appUrl: '',
    stage: STAGE.IN_PROGRESS,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-6">
      <div className="p-4 rounded-xl bg-ink-50 border border-ink-200">
        <div className="font-medium text-ink-800 text-sm">{lead.university}</div>
        <div className="text-ink-500 text-xs mt-0.5">{lead.labName} · {lead.professor}</div>
      </div>

      {/* The correction at the heart of this rebuild. */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-sky-50 border border-sky-200">
        <Lightbulb size={15} className="text-sky-600 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-sky-900 leading-relaxed">
          This starts as <strong>In progress</strong>, not as submitted. Converting a
          lead means you have decided to apply — you can mark it submitted once it
          has actually gone.
        </p>
      </div>

      <Field label="How are you applying?">
        <Segmented
          value={form.applicationType}
          onChange={v => set('applicationType', v)}
          options={[
            { value: 'portal', label: '🌐 Portal' },
            { value: 'email',  label: '✉️ Email' },
            { value: 'both',   label: '🔀 Both' },
          ]}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DeadlineInput label="Opens" value={form.startDate} onChange={v => set('startDate', v)} countryCode={lead.country} />
        <DeadlineInput label="Deadline" value={form.deadline} onChange={v => set('deadline', v)} countryCode={lead.country} />
      </div>

      {(form.applicationType === 'portal' || form.applicationType === 'both') && (
        <Field label="Application portal URL">
          <Input value={form.appUrl} onChange={e => set('appUrl', e.target.value)}
            placeholder="https://apply.university.edu/…" />
        </Field>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-ink-100">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" loading={loading} icon={ArrowUpRight}>
          Convert to application
        </Button>
      </div>
    </form>
  )
}

export default function LeadsPage() {
  const uid = useUid()
  const { loading, leads } = useData()
  const toast = useToast()
  const mutate = useMutation()

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [convertTarget, setConvertTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('active')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leads
      .filter(l => {
        const state = l.state || LEAD_STATE.ACTIVE
        if (filter === 'all') return true
        if (filter === 'active') return state === LEAD_STATE.ACTIVE
        if (filter === 'converted') return state === LEAD_STATE.CONVERTED
        return state === LEAD_STATE.NOT_INTERESTED || state === LEAD_STATE.EXPIRED
      })
      .filter(l => !q || [l.university, l.labName, l.professor, l.researchArea, l.notes]
        .some(s => s?.toLowerCase().includes(q)))
      .sort((a, b) => {
        // Priority first, then whatever is closing soonest.
        const pa = PRIORITIES[a.priority]?.order ?? 9
        const pb = PRIORITIES[b.priority]?.order ?? 9
        if (pa !== pb) return pa - pb
        return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
      })
  }, [leads, filter, search])

  const handleAdd = async (data) => {
    setSaving(true)
    const r = await mutate(() => addLead(uid, data), {
      success: `Saved ${data.university}.`,
      failure: 'Could not save that lead.',
    })
    setSaving(false)
    if (r.ok) setAddOpen(false)
  }

  const handleEdit = async (data) => {
    setSaving(true)
    const r = await mutate(() => updateLead(uid, editTarget.id, data), {
      success: 'Lead updated.',
      failure: 'Could not save your changes.',
    })
    setSaving(false)
    if (r.ok) setEditTarget(null)
  }

  const handleArchive = async (lead) => {
    const r = await mutate(() => archiveLead(uid, lead.id), { failure: 'Could not archive that lead.' })
    if (!r.ok) return
    // Charter #13, and the reason we archive instead of deleting.
    toast.undo(
      `${lead.university} archived.`,
      () => mutate(() => restoreLead(uid, lead.id), { success: 'Restored.' }),
      { key: `archive-${lead.id}` },
    )
  }

  const handleTriage = async (lead, state) => {
    const previous = lead.state || LEAD_STATE.ACTIVE
    const r = await mutate(() => setLeadState(uid, lead.id, state), { failure: 'Could not update that lead.' })
    if (!r.ok) return
    toast.undo(
      state === LEAD_STATE.EXPIRED
        ? `${lead.university} marked as passed.`
        : `${lead.university} ruled out.`,
      () => mutate(() => setLeadState(uid, lead.id, previous)),
      { key: `triage-${lead.id}` },
    )
  }

  const handleConvert = async (extra) => {
    setSaving(true)
    const r = await mutate(() => promoteLeadToApplication(uid, convertTarget.id, extra), {
      success: `${convertTarget.university} is now an application in progress.`,
      failure: 'Could not convert that lead.',
    })
    setSaving(false)
    if (r.ok) setConvertTarget(null)
  }

  const activeCount = leads.filter(l => (l.state || 'active') === LEAD_STATE.ACTIVE).length
  const convertedCount = leads.filter(l => l.state === LEAD_STATE.CONVERTED).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink-900">Leads</h1>
          <p className="text-ink-500 text-sm mt-1">
            {activeCount} active · {convertedCount} converted · {leads.length} saved in total
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setAddOpen(true)}>
          Save new lead
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" aria-hidden="true" />
          <Input
            className="pl-9 pr-9"
            placeholder="Search university, professor, lab, notes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search leads"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700
                         transition-colors duration-120"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={cn(
                'px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap',
                'transition-all duration-150 active:scale-[0.97]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400',
                filter === f.value
                  ? 'bg-ink-900 text-white shadow-surface'
                  : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50 hover:border-ink-300',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <CardGridSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title={search || filter !== 'active' ? 'Nothing matches' : 'No leads yet'}
          description={
            search || filter !== 'active'
              ? 'Try a different search, or switch the filter above.'
              : 'When you spot a position on LinkedIn, a lab page, or from a friend, save it here. Fifteen seconds now saves an hour of re-finding it later.'
          }
          action={
            search || filter !== 'active'
              ? <Button variant="secondary" onClick={() => { setSearch(''); setFilter('active') }}>Clear filters</Button>
              : <Button variant="primary" icon={Plus} onClick={() => setAddOpen(true)}>Save your first lead</Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((lead, i) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                index={i}
                onEdit={setEditTarget}
                onConvert={setConvertTarget}
                onArchive={handleArchive}
                onTriage={handleTriage}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Save a new lead"
        description="Capture it now, decide later." confirmClose>
        <LeadForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} loading={saving} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit lead" confirmClose>
        {editTarget && (
          <LeadForm initial={editTarget} onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)} loading={saving} />
        )}
      </Modal>

      <Modal open={!!convertTarget} onClose={() => setConvertTarget(null)}
        title="Convert to an application">
        {convertTarget && (
          <ConvertForm lead={convertTarget} onSubmit={handleConvert}
            onCancel={() => setConvertTarget(null)} loading={saving} />
        )}
      </Modal>
    </div>
  )
}
