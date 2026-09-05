// src/components/ApplicationDetailPanel.jsx
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ExternalLink, Plus, Trash2, MessageSquare, Clock, FileText,
  Copy, Sparkles, Mails, Wallet, CalendarClock,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  subscribeFollowups, subscribeActivity, addFollowup, deleteFollowup,
  addActivityEntry, setApplicationStage,
} from '../lib/db'
import { useToast, useMutation } from '../hooks/useToast'
import { useData, useCopy } from '../hooks/useData'
import { UI_HARNESS } from '../lib/config'
import { harnessSubcollections } from '../lib/harnessData'
import { STAGE_ORDER, STAGES, LOR_STATUSES } from '../lib/model'
import { readiness } from '../lib/derive'
import {
  StageBadge, DeadlineDisplay, PriorityBadge, FitScore, CountryChip,
  DocsProgress, LorStatusBadge, FeeDisplay,
} from './domain'
import { Button, Badge, Progress, SectionTitle, Tooltip, CopiedPill, cn } from './ui'
import { Select, TextArea, Input } from './form'
import EmailComposer from './EmailComposer'

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: FileText },
  { id: 'followups', label: 'Follow-ups', icon: MessageSquare },
  { id: 'log',       label: 'Activity',   icon: Clock },
]

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm py-1">
      <span className="text-ink-500 shrink-0">{label}</span>
      <span className="text-ink-800 text-right min-w-0 truncate">{children}</span>
    </div>
  )
}

export default function ApplicationDetailPanel({ appId, uid, onClose, onEdit }) {
  const { applicationById, documents, profile } = useData()
  const toast = useToast()
  const mutate = useMutation()
  const { copied, copy } = useCopy()

  const [tab, setTab] = useState('overview')
  const [followups, setFollowups] = useState([])
  const [activity, setActivity] = useState([])
  const [fuText, setFuText] = useState('')
  const [fuDate, setFuDate] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  // Read from the live store rather than holding a copy. The old panel kept its
  // own snapshot and showed stale values immediately after an edit.
  const app = appId ? applicationById(appId) : null

  useEffect(() => {
    if (!appId) return undefined

    if (UI_HARNESS) {
      const fixture = harnessSubcollections[appId] || { followups: [], activity: [] }
      setFollowups(fixture.followups)
      setActivity(fixture.activity)
      return undefined
    }

    const unsubs = [
      subscribeFollowups(uid, appId, setFollowups),
      subscribeActivity(uid, appId, setActivity),
    ]
    return () => unsubs.forEach(fn => fn?.())
  }, [appId, uid])

  useEffect(() => { setTab('overview') }, [appId])

  if (!app) return null

  const recommenders = profile?.recommenders || []
  const progress = readiness(app, documents)

  const handleStageChange = async (stage) => {
    if (stage === app.stage) return
    setBusy(true)
    await mutate(
      () => setApplicationStage(uid, app.id, stage, {
        previousStage: STAGES[app.stage]?.label,
        label: STAGES[stage]?.label,
      }),
      { success: `Moved to ${STAGES[stage]?.label}.`, failure: 'Could not change the stage.' },
    )
    setBusy(false)
  }

  const handleAddFollowup = async () => {
    if (!fuText.trim()) return
    const r = await mutate(
      () => addFollowup(uid, app.id, {
        note: fuText.trim(),
        date: fuDate || new Date().toISOString().slice(0, 10),
      }),
      { failure: 'Could not save that follow-up.' },
    )
    if (r.ok) { setFuText(''); setFuDate('') }
  }

  const handleAddNote = async () => {
    if (!note.trim()) return
    const r = await mutate(() => addActivityEntry(uid, app.id, note.trim()),
      { failure: 'Could not save that note.' })
    if (r.ok) setNote('')
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.aside
        role="dialog" aria-modal="true" aria-label={`${app.university} details`}
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[480px]
                   bg-white border-l border-ink-200 flex flex-col shadow-float"
      >
        {/* Header */}
        <header className="px-5 pt-5 pb-4 border-b border-ink-100 shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-lg text-ink-900 leading-tight">{app.university}</h2>
              <p className="text-ink-500 text-sm truncate mt-0.5">
                {[app.labName, app.professor].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            <button
              onClick={onClose} aria-label="Close"
              className="shrink-0 p-2 -mr-1 -mt-1 rounded-lg text-ink-400
                         hover:bg-ink-100 hover:text-ink-800 active:scale-90
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400
                         transition-all duration-150"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <StageBadge stage={app.stage} />
            {app.priority && <PriorityBadge priority={app.priority} />}
            {app.country && <CountryChip code={app.country} />}
            {app.fitScore > 0 && <FitScore score={app.fitScore} />}
            {app.intake && <Badge tone="ink">{app.intake}</Badge>}
          </div>

          {/* Stage change is the most frequent action here, so it lives at the
              top rather than behind the edit form. */}
          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs text-ink-400 shrink-0" htmlFor="stage-select">Stage</label>
            <Select
              id="stage-select"
              value={app.stage}
              onChange={e => handleStageChange(e.target.value)}
              disabled={busy}
              className="text-sm py-2"
            >
              {STAGE_ORDER.map(s => <option key={s} value={s}>{STAGES[s].label}</option>)}
            </Select>
          </div>

          <div className="mt-3">
            <Progress value={progress.percent} max={100} label={`${progress.percent}% ready`} />
          </div>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-ink-100 px-5 shrink-0" role="tablist">
          {TABS.map(t => {
            const active = tab === t.id
            const count = t.id === 'followups' ? followups.length : t.id === 'log' ? activity.length : null
            return (
              <button
                key={t.id} role="tab" aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  'relative flex items-center gap-1.5 py-3 px-3 text-xs font-medium transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-300 rounded-t',
                  active ? 'text-ink-900' : 'text-ink-400 hover:text-ink-700',
                )}
              >
                <t.icon size={13} aria-hidden="true" />
                {t.label}
                {count !== null && count > 0 && (
                  <span className="text-ink-400 tabular-nums">({count})</span>
                )}
                {active && (
                  <motion.span layoutId="detail-tab" className="absolute inset-x-0 -bottom-px h-0.5 bg-ink-900" />
                )}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* Links */}
              <div className="flex flex-wrap gap-2">
                {[
                  { url: app.labUrl, label: 'Lab site', tone: 'ink' },
                  { url: app.professorProfile, label: 'Professor', tone: 'ink' },
                  { url: app.appUrl, label: 'Apply portal', tone: 'sage' },
                  { url: app.driveLink, label: 'Documents', tone: 'sky' },
                ].filter(l => l.url).map(l => (
                  <a
                    key={l.label} href={l.url} target="_blank" rel="noreferrer"
                    className={cn(
                      'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border',
                      'transition-colors duration-150 hover:bg-ink-50',
                      l.tone === 'sage' ? 'border-sage-200 text-sage-700 hover:bg-sage-50'
                        : l.tone === 'sky' ? 'border-sky-200 text-sky-700 hover:bg-sky-50'
                        : 'border-ink-200 text-ink-600',
                    )}
                  >
                    <ExternalLink size={11} aria-hidden="true" /> {l.label}
                  </a>
                ))}
              </div>

              {app.applicationId && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-ink-50">
                  <span className="text-xs text-ink-400 shrink-0">Reference</span>
                  <code className="text-xs font-mono text-ink-800 flex-1 truncate">{app.applicationId}</code>
                  <button
                    onClick={() => copy(app.applicationId, 'ref')}
                    className="text-ink-400 hover:text-ink-800 transition-colors duration-120 shrink-0"
                    aria-label="Copy reference number"
                  >
                    <Copy size={13} aria-hidden="true" />
                  </button>
                  <CopiedPill show={copied === 'ref'} />
                </div>
              )}

              {/* Deadlines */}
              <section>
                <SectionTitle>Deadlines</SectionTitle>
                <div className="space-y-3">
                  {[
                    { label: 'Applications open', v: app.startDate, kind: 'opens' },
                    { label: 'Application', v: app.deadline },
                    { label: 'Recommendations', v: app.lorDeadline },
                    { label: 'Decision / reply by', v: app.expectedDecision },
                  ].filter(d => d.v).map(d => (
                    <DeadlineDisplay key={d.label} value={d.v} label={d.label} kind={d.kind} />
                  ))}
                  {!app.startDate && !app.deadline && !app.lorDeadline && !app.expectedDecision && (
                    <p className="text-xs text-ink-400">No dates set yet.</p>
                  )}
                </div>
              </section>

              {/* Recommenders */}
              {(app.recommenders || []).length > 0 && (
                <section>
                  <SectionTitle>Recommendation letters</SectionTitle>
                  <ul className="space-y-2">
                    {app.recommenders.map(entry => {
                      const rec = recommenders.find(r => r.id === entry.recommenderId)
                      return (
                        <li key={entry.recommenderId} className="flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate text-ink-700">
                            {rec?.name || 'Unknown recommender'}
                          </span>
                          <LorStatusBadge status={entry.status} />
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}

              {/* Documents */}
              <section>
                <SectionTitle>Documents</SectionTitle>
                <DocsProgress app={app} documents={documents} className="mb-3" />
                <div className="flex flex-wrap gap-1.5">
                  {documents
                    .filter(d => (app.requiredDocs || []).includes(d.id))
                    .map(d => {
                      const done = Boolean((app.submittedDocs || app.docs || {})[d.id])
                      return (
                        <span
                          key={d.id}
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs',
                            done ? 'bg-sage-100 text-sage-700' : 'bg-ink-100 text-ink-500',
                          )}
                        >
                          {done ? '✓' : '○'} {d.name}
                        </span>
                      )
                    })}
                </div>
              </section>

              {/* Fee */}
              {app.fee && (Number(app.fee.amount) > 0 || app.fee.waiverRequested) && (
                <section>
                  <SectionTitle>Fee</SectionTitle>
                  <FeeDisplay fee={app.fee} />
                </section>
              )}

              {/* Outreach — the composer is available whether or not you have
                  emailed yet, since the common need is writing the first one. */}
              <section>
                <SectionTitle>Write to the professor</SectionTitle>
                <EmailComposer application={app} />
              </section>

              {/* Email */}
              {app.emailed?.sentAt && (
                <section>
                  <SectionTitle>Outreach record</SectionTitle>
                  <Row label="Emailed on">{app.emailed.sentAt}</Row>
                  {app.emailed.subject && (
                    <div className="flex items-center gap-2 mt-2 p-2.5 rounded-lg bg-ink-50">
                      <code className="text-xs text-ink-600 font-mono flex-1 truncate">
                        {app.emailed.subject}
                      </code>
                      <button
                        onClick={() => copy(app.emailed.subject, 'subject')}
                        className="text-ink-400 hover:text-ink-800 shrink-0"
                        aria-label="Copy subject line"
                      >
                        <Copy size={12} aria-hidden="true" />
                      </button>
                      <CopiedPill show={copied === 'subject'} />
                    </div>
                  )}
                  <Row label="Reply">
                    {app.emailed.replied
                      ? <span className="text-sage-700 font-medium">Received</span>
                      : <span className="text-ink-400">Not yet</span>}
                  </Row>
                </section>
              )}

              {/* Notes */}
              {[
                { label: 'Why this lab', v: app.whyThisLab },
                { label: 'SOP angle', v: app.sopAngle },
                { label: 'Interview notes', v: app.interviewNotes },
              ].filter(n => n.v).map(n => (
                <section key={n.label}>
                  <SectionTitle>{n.label}</SectionTitle>
                  <p className="text-sm text-ink-700 bg-ink-50 rounded-xl p-3.5 leading-relaxed whitespace-pre-wrap">
                    {n.v}
                  </p>
                </section>
              ))}
            </div>
          )}

          {tab === 'followups' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-ink-200 p-4 space-y-3">
                <p className="text-xs font-medium text-ink-600">Log a follow-up</p>
                <TextArea rows={2} value={fuText} onChange={e => setFuText(e.target.value)}
                  placeholder="Sent a follow-up mentioning their MICCAI paper…" />
                <div className="flex gap-2">
                  <Input type="date" value={fuDate} onChange={e => setFuDate(e.target.value)}
                    aria-label="Follow-up date" />
                  <Button variant="primary" icon={Plus} onClick={handleAddFollowup}
                    disabled={!fuText.trim()} disabledReason="Write a note first.">
                    Add
                  </Button>
                </div>
              </div>

              {followups.length === 0 ? (
                <p className="text-center text-ink-400 text-sm py-8">
                  Nothing logged yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {followups.map(fu => (
                    <li key={fu.id} className="group flex gap-3 items-start p-3 rounded-xl bg-ink-50">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ink-700 leading-relaxed">{fu.note}</p>
                        {fu.date && <p className="text-xs text-ink-400 mt-1">{fu.date}</p>}
                      </div>
                      <button
                        onClick={() => mutate(() => deleteFollowup(uid, app.id, fu.id))}
                        aria-label="Delete follow-up"
                        className="text-ink-300 hover:text-rose-500 opacity-0 group-hover:opacity-100
                                   focus-visible:opacity-100 transition-all duration-150 shrink-0"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'log' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-ink-200 p-4 space-y-3">
                <p className="text-xs font-medium text-ink-600">Add a note</p>
                <TextArea rows={2} value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Anything worth remembering…" />
                <Button variant="primary" icon={Plus} onClick={handleAddNote}
                  disabled={!note.trim()} disabledReason="Write something first."
                  className="w-full">
                  Log it
                </Button>
              </div>

              {activity.length === 0 ? (
                <p className="text-center text-ink-400 text-sm py-8">Nothing logged yet.</p>
              ) : (
                <ol className="relative pl-4 space-y-4">
                  <span className="absolute left-0 top-2 bottom-2 w-px bg-ink-200" aria-hidden="true" />
                  {activity.map(a => (
                    <li key={a.id} className="relative">
                      <span
                        className={cn(
                          'absolute -left-[17px] top-1.5 w-2 h-2 rounded-full',
                          a.system ? 'bg-ink-300' : 'bg-sage-500',
                        )}
                        aria-hidden="true"
                      />
                      <p className="text-sm text-ink-700 leading-relaxed">{a.note}</p>
                      <p className="text-xs text-ink-400 mt-0.5">
                        {a.system && <span className="text-ink-300">auto · </span>}
                        {a.createdAt?.seconds
                          ? format(new Date(a.createdAt.seconds * 1000), 'MMM d, yyyy · h:mm a')
                          : 'just now'}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>

        <footer className="p-4 border-t border-ink-100 shrink-0">
          <Button variant="secondary" onClick={onEdit} className="w-full">
            Edit application
          </Button>
        </footer>
      </motion.aside>
    </AnimatePresence>
  )
}
