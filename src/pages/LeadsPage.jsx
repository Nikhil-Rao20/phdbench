// src/pages/LeadsPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The shared board.
//
// Facts belong to the group; decisions belong to you. Every card shows who
// found the lead and how many members have applied, but the status pill, the
// priority and the fit score are read from your own entry in the lead's state
// map — so a teammate converting a lead never reclassifies it on your board.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Lightbulb, ExternalLink, Pencil, Archive as ArchiveIcon,
  ArrowUpRight, Search, ThumbsDown, CalendarX, Users, UserCircle2, Trash2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGroups } from '../hooks/useGroups'
import { useToast, useMutation } from '../hooks/useToast'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import {
  addSharedLead, updateSharedLead, setMyLeadDecision,
  archiveLeadForMe, restoreLeadForMe, convertSharedLead, destroySharedLead,
} from '../lib/groupsDb'
import { LEAD_STATE, STAGE } from '../lib/model'
import { appliedCount, isGroupAdmin, canDestroyLead } from '../lib/access'
import { isOverdue } from '../lib/datetime'
import { singleLine } from '../lib/safety'
import Modal from '../components/Modal'
import LeadForm from '../components/LeadForm'
import { CardGridSkeleton } from '../components/Skeleton'
import { Button, EmptyState, Tooltip, Badge, SafeLink, cn } from '../components/ui'
import {
  LeadStateBadge, PriorityBadge, DeadlineDisplay, CountryChip, UrgencyDot,
} from '../components/domain'
import { Field, Input, Segmented, DeadlineInput, TextArea } from '../components/form'

const FILTERS = [
  { value: 'active',    label: 'Active' },
  { value: 'all',       label: 'All' },
  { value: 'converted', label: 'Applied' },
  { value: 'closed',    label: 'Ruled out' },
]

/** How many others have applied — counted from the shared map, not their data. */
function AppliedByOthers({ lead, uid }) {
  const total = appliedCount(lead)
  const others = total - (lead.states?.[uid]?.state === LEAD_STATE.CONVERTED ? 1 : 0)
  if (others <= 0) return null

  return (
    <Tooltip label={`${others} other ${others === 1 ? 'member has' : 'members have'} applied to this`}>
      <span className="inline-flex items-center gap-1 text-xs text-sage-700 bg-sage-50
                       px-2 py-0.5 rounded-md">
        <Users size={11} aria-hidden="true" />
        {others} applied
      </span>
    </Tooltip>
  )
}

function LeadCard({ lead, index, uid, canDestroy, onEdit, onConvert, onArchive, onTriage, onDestroy }) {
  const mine = lead.mine
  const expired = lead.deadline && isOverdue(lead.deadline)
  const converted = mine.state === LEAD_STATE.CONVERTED
  const ruledOut = mine.state === LEAD_STATE.NOT_INTERESTED || mine.state === LEAD_STATE.EXPIRED

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index * 0.02, 0.12), duration: 0.22 }}
      className={cn(
        'group bg-white rounded-2xl border shadow-surface hover:shadow-raised p-5',
        'flex flex-col gap-3 transition-all duration-200 min-w-0',
        converted ? 'border-sage-200 bg-sage-50/30' : 'border-ink-100 hover:border-ink-200',
        ruledOut && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* singleLine: a pasted wall of characters with no spaces cannot be
              wrapped by CSS and would push the whole page sideways. */}
          <h3 className="font-medium text-ink-900 text-sm leading-snug truncate">
            {singleLine(lead.university, 120)}
          </h3>
          <p className="text-ink-500 text-xs truncate mt-0.5">
            {singleLine(lead.labName, 120) || '—'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <LeadStateBadge state={mine.state || LEAD_STATE.ACTIVE} />
          {mine.priority && <PriorityBadge priority={mine.priority} />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-600 min-w-0">
        <span className="truncate max-w-[14rem]">👤 {singleLine(lead.professor, 80)}</span>
        {lead.researchArea && <span className="text-ink-500 truncate">🔬 {singleLine(lead.researchArea, 60)}</span>}
        {lead.country && <CountryChip code={lead.country} />}
      </div>

      {lead.fundingNote && (
        <p className="text-xs text-sage-700 bg-sage-50 rounded-lg px-2.5 py-1.5 truncate">
          💰 {singleLine(lead.fundingNote, 160)}
        </p>
      )}

      {lead.notes && (
        <p className="text-xs text-ink-500 line-clamp-2 bg-ink-50 rounded-lg p-2.5 leading-relaxed break-words">
          {singleLine(lead.notes, 400)}
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

      <div className="flex flex-wrap items-center gap-2 text-xs min-w-0">
        <SafeLink href={lead.labUrl}
          className="text-sage-700 hover:underline inline-flex items-center gap-1">
          <ExternalLink size={11} aria-hidden="true" /> Lab
        </SafeLink>
        <SafeLink href={lead.linkedinPost}
          className="text-sky-600 hover:underline inline-flex items-center gap-1">
          <ExternalLink size={11} aria-hidden="true" /> Post
        </SafeLink>
        <AppliedByOthers lead={lead} uid={uid} />
      </div>

      {/* Attribution: who found this, so you know who to ask. */}
      <div className="flex items-center gap-1.5 text-xs text-ink-400 min-w-0">
        <UserCircle2 size={12} className="shrink-0" aria-hidden="true" />
        <span className="truncate">
          {lead.addedBy === uid ? 'Added by you' : `Added by ${singleLine(lead.addedByName || lead.addedByEmail || 'a member', 40)}`}
        </span>
      </div>

      <div className="flex items-center gap-1.5 pt-3 border-t border-ink-100">
        {!converted ? (
          <Button size="sm" variant="primary" icon={ArrowUpRight}
            onClick={() => onConvert(lead)} className="flex-1">
            Apply to this
          </Button>
        ) : (
          <span className="flex-1 text-xs text-sage-700">✓ In your applications</span>
        )}

        {!converted && !ruledOut && (
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

        <Tooltip label="Edit — this changes the lead for everyone">
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

        <Tooltip label="Hide from your board — others keep it">
          <button
            onClick={() => onArchive(lead)}
            aria-label="Archive from my board"
            className="p-2 rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700
                       active:scale-90 transition-all duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400"
          >
            <ArchiveIcon size={14} aria-hidden="true" />
          </button>
        </Tooltip>

        {canDestroy && (
          <Tooltip label="Delete for everyone in the group">
            <button
              onClick={() => onDestroy(lead)}
              aria-label="Delete for everyone"
              className="p-2 rounded-lg text-ink-400 hover:bg-rose-50 hover:text-rose-600
                         active:scale-90 transition-all duration-150
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </Tooltip>
        )}
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
        <div className="font-medium text-ink-800 text-sm">{singleLine(lead.university, 120)}</div>
        <div className="text-ink-500 text-xs mt-0.5">
          {[lead.labName, lead.professor].filter(Boolean).join(' · ')}
        </div>
      </div>

      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-sky-50 border border-sky-200">
        <Lightbulb size={15} className="text-sky-600 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-sky-900 leading-relaxed">
          This creates a <strong>private</strong> application only you can see, and
          marks the lead as applied on <strong>your</strong> board. Nobody else&rsquo;s
          view changes, and no one can see what you write in it.
        </p>
      </div>

      <Field label="How are you applying">
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
        <DeadlineInput label="Applications open" value={form.startDate}
          onChange={v => set('startDate', v)} countryCode={lead.country} />
        <DeadlineInput label="Deadline" value={form.deadline}
          onChange={v => set('deadline', v)} countryCode={lead.country} />
      </div>

      {(form.applicationType === 'portal' || form.applicationType === 'both') && (
        <Field label="Application portal URL">
          <Input value={form.appUrl} onChange={e => set('appUrl', e.target.value)}
            placeholder="https://apply.university.edu/…" maxLength={2000} />
        </Field>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" icon={ArrowUpRight} loading={loading}>
          Start my application
        </Button>
      </div>
    </form>
  )
}

export default function LeadsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const {
    active, leads, leadsLoading, loadingMore, exhausted, loadMore, groups, groupsLoading,
  } = useGroups()
  const mutate = useMutation()
  const toast = useToast()

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [convertTarget, setConvertTarget] = useState(null)
  const [destroyTarget, setDestroyTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('active')
  const [addDirty, setAddDirty] = useState(false)
  const [editDirty, setEditDirty] = useState(false)

  useEffect(() => { if (!addOpen) setAddDirty(false) }, [addOpen])
  useEffect(() => { if (!editTarget) setEditDirty(false) }, [editTarget])

  const uid = user?.uid
  const canDestroy = active ? isGroupAdmin(active, user) : false

  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMore,
    enabled: !exhausted && !leadsLoading,
  })

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leads
      .filter(l => {
        const state = l.mine.state || LEAD_STATE.ACTIVE
        if (filter === 'active') return state === LEAD_STATE.ACTIVE
        if (filter === 'converted') return state === LEAD_STATE.CONVERTED
        if (filter === 'closed') return state === LEAD_STATE.NOT_INTERESTED || state === LEAD_STATE.EXPIRED
        return true
      })
      .filter(l => !q || [l.university, l.labName, l.professor, l.researchArea, l.notes]
        .some(v => String(v || '').toLowerCase().includes(q)))
  }, [leads, filter, search])

  const counts = useMemo(() => ({
    active: leads.filter(l => (l.mine.state || LEAD_STATE.ACTIVE) === LEAD_STATE.ACTIVE).length,
    converted: leads.filter(l => l.mine.state === LEAD_STATE.CONVERTED).length,
  }), [leads])

  const handleAdd = async (data) => {
    setSaving(true)
    const r = await mutate(() => addSharedLead(active.id, user, data), {
      success: 'Saved to the shared board.',
      failure: 'Could not save that lead.',
    })
    setSaving(false)
    if (r.ok) setAddOpen(false)
  }

  const handleEdit = async (data) => {
    setSaving(true)
    const r = await mutate(() => updateSharedLead(active.id, editTarget.id, data), {
      success: 'Updated for everyone in the group.',
      failure: 'Could not save those changes.',
    })
    setSaving(false)
    if (r.ok) setEditTarget(null)
  }

  const handleConvert = async (extra) => {
    setSaving(true)
    const r = await mutate(() => convertSharedLead(active.id, convertTarget.id, user, extra), {
      success: 'Application started. Only you can see it.',
      failure: 'Could not start that application.',
    })
    setSaving(false)
    if (r.ok) setConvertTarget(null)
  }

  const handleArchive = (lead) => {
    mutate(() => archiveLeadForMe(active.id, lead.id, uid), { failure: 'Could not archive that.' })
      .then(r => {
        if (r.ok) {
          toast.undo('Hidden from your board. Others still see it.',
            () => restoreLeadForMe(active.id, lead.id, uid))
        }
      })
  }

  const handleTriage = (lead, state) => {
    mutate(() => setMyLeadDecision(active.id, lead.id, uid, state), { failure: 'Could not update that.' })
      .then(r => {
        if (r.ok) {
          toast.undo('Ruled out on your board only.',
            () => setMyLeadDecision(active.id, lead.id, uid, LEAD_STATE.ACTIVE))
        }
      })
  }

  const handleDestroy = async () => {
    const lead = destroyTarget
    setDestroyTarget(null)
    await mutate(() => destroySharedLead(active.id, lead.id), {
      success: 'Deleted for the whole group.',
      failure: 'Could not delete that lead.',
    })
  }

  // No group yet: the board cannot exist without one, so say so and point at it
  // rather than showing an empty list that looks broken.
  if (!groupsLoading && groups.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl text-ink-900">Leads</h1>
        <EmptyState
          icon={Users}
          title="You need a group first"
          description="Leads live on a shared board, and a board belongs to a group. Create one — it works perfectly well with just you in it, and you can invite people later."
          action={
            <Button variant="primary" icon={Plus} onClick={() => navigate('/groups')}>
              Create a group
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl text-ink-900">Leads</h1>
          <p className="text-ink-500 text-sm mt-1">
            {active ? (
              <>
                <span className="text-ink-700">{active.name}</span>
                {' · '}{counts.active} active
                {counts.converted > 0 && ` · ${counts.converted} applied`}
              </>
            ) : 'Loading…'}
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setAddOpen(true)} disabled={!active}
          disabledReason="Pick a group first.">
          Save new lead
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search university, professor, lab, notes…"
            className="pl-10"
            aria-label="Search leads"
          />
        </div>
        <div className="shrink-0">
          <Segmented value={filter} onChange={setFilter} options={FILTERS} />
        </div>
      </div>

      {leadsLoading ? (
        <CardGridSkeleton count={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title={search || filter !== 'active' ? 'Nothing matches' : 'The board is empty'}
          description={
            search || filter !== 'active'
              ? 'Try a different search, or switch the filter.'
              : 'Save the first lead. Everyone in this group sees it immediately.'
          }
          action={!search && filter === 'active'
            ? <Button variant="primary" icon={Plus} onClick={() => setAddOpen(true)}>Save new lead</Button>
            : null}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {visible.map((lead, i) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  index={i}
                  uid={uid}
                  canDestroy={canDestroy}
                  onEdit={setEditTarget}
                  onConvert={setConvertTarget}
                  onArchive={handleArchive}
                  onTriage={handleTriage}
                  onDestroy={setDestroyTarget}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* The sentinel: crossing it fetches the next page before the reader
              reaches the end, so the list does not visibly stall. */}
          {!exhausted && (
            <div ref={sentinelRef} className="flex justify-center py-6">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-sm text-ink-400">
                  <span className="w-4 h-4 border-2 border-ink-200 border-t-ink-600 rounded-full animate-spin" />
                  Loading more…
                </div>
              ) : (
                <Button variant="ghost" onClick={loadMore}>Load more</Button>
              )}
            </div>
          )}

          {exhausted && leads.length > 25 && (
            <p className="text-center text-xs text-ink-400 py-4">
              That is every lead on this board.
            </p>
          )}
        </>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Save a new lead"
        description={active ? `Everyone in ${active.name} will see this.` : ''} isDirty={addDirty}>
        <LeadForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)}
          onDirtyChange={setAddDirty} loading={saving} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit lead"
        description="These are the group's shared facts — your changes are visible to everyone."
        isDirty={editDirty}>
        {editTarget && (
          <LeadForm initial={editTarget} onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)} onDirtyChange={setEditDirty} loading={saving} />
        )}
      </Modal>

      <Modal open={!!convertTarget} onClose={() => setConvertTarget(null)}
        title="Start an application">
        {convertTarget && (
          <ConvertForm lead={convertTarget} onSubmit={handleConvert}
            onCancel={() => setConvertTarget(null)} loading={saving} />
        )}
      </Modal>

      <Modal open={!!destroyTarget} onClose={() => setDestroyTarget(null)}
        title="Delete for everyone?">
        {destroyTarget && (
          <div className="space-y-5">
            <p className="text-sm text-ink-600 leading-relaxed">
              <strong>{singleLine(destroyTarget.university, 120)}</strong> will be removed
              from this board for all {(active?.memberEmails || []).length} members, including
              anyone who was still considering it. Applications already created from it are
              private and stay untouched.
            </p>
            <p className="text-sm text-ink-500">
              To hide it from your own board only, archive it instead.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDestroyTarget(null)}>Keep it</Button>
              <Button variant="danger" icon={Trash2} onClick={handleDestroy}>Delete for everyone</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
