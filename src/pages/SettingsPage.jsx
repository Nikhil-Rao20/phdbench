import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Settings as SettingsIcon, FileText, Mails, GraduationCap, ShieldCheck,
  Download, Upload, Plus, Trash2, AlertTriangle, Database, Check,
} from 'lucide-react'
import { useData, useUid } from '../hooks/useData'
import { useAuth } from '../hooks/useAuth'
import { useToast, useMutation } from '../hooks/useToast'
import { saveProfile, exportEverything, importBackup, migrateToV2 } from '../lib/db'
import { downloadJSON } from '../lib/calendar'
import {
  TESTS, TEST_TYPE, EVAL_PROVIDER, EVAL_STATUS, EVAL_STATUSES, COUNTRIES,
} from '../lib/model'
import { daysUntil, todayInZone } from '../lib/datetime'
import DocumentsManager from '../components/DocumentsManager'
import { Button, SectionTitle, Badge, EmptyState, Tooltip, cn } from '../components/ui'
import { Field, Input, Select, TextArea } from '../components/form'

const uid4 = () => Math.random().toString(36).slice(2, 10)

function Card({ icon: Icon, title, description, children, delay = 0 }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-white rounded-2xl border border-ink-100 shadow-surface p-6"
    >
      <div className="flex items-start gap-3 mb-5 pb-4 border-b border-ink-100">
        <span className="w-9 h-9 rounded-xl bg-ink-50 flex items-center justify-center shrink-0">
          <Icon size={17} className="text-ink-600" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-lg text-ink-900 leading-tight">{title}</h2>
          {description && (
            <p className="text-sm text-ink-500 mt-1 leading-relaxed max-w-prose">{description}</p>
          )}
        </div>
      </div>
      {children}
    </motion.section>
  )
}

// ─── Recommenders ────────────────────────────────────────────────────────────

function RecommendersSection({ profile, onSave }) {
  const list = profile?.recommenders || []
  const [draft, setDraft] = useState({ name: '', email: '', institution: '', relationship: '' })

  const add = () => {
    if (!draft.name.trim()) return
    onSave({ recommenders: [...list, { id: uid4(), ...draft }] })
    setDraft({ name: '', email: '', institution: '', relationship: '' })
  }

  const remove = (id) => onSave({ recommenders: list.filter(r => r.id !== id) })

  return (
    <div className="space-y-5">
      {list.length > 0 && (
        <ul className="space-y-2">
          {list.map(rec => (
            <li key={rec.id} className="group flex items-center gap-3 p-3 rounded-xl bg-ink-50">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-800 truncate">{rec.name}</p>
                <p className="text-xs text-ink-400 truncate">
                  {[rec.institution, rec.relationship, rec.email].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                onClick={() => remove(rec.id)}
                aria-label={`Remove ${rec.name}`}
                className="p-1.5 rounded-lg text-ink-400 hover:bg-rose-50 hover:text-rose-600
                           opacity-0 group-hover:opacity-100 focus-visible:opacity-100
                           transition-all duration-150 shrink-0"
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-ink-200 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name">
            <Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              placeholder="Prof. A. Ramesh" />
          </Field>
          <Field label="Email">
            <Input type="email" value={draft.email} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))}
              placeholder="ramesh@university.edu" />
          </Field>
          <Field label="Institution">
            <Input value={draft.institution} onChange={e => setDraft(d => ({ ...d, institution: e.target.value }))}
              placeholder="RGUKT Nuzvid" />
          </Field>
          <Field label="Relationship">
            <Input value={draft.relationship} onChange={e => setDraft(d => ({ ...d, relationship: e.target.value }))}
              placeholder="Undergraduate advisor" />
          </Field>
        </div>
        <Button variant="primary" icon={Plus} onClick={add}
          disabled={!draft.name.trim()} disabledReason="Enter a name first.">
          Add recommender
        </Button>
      </div>
    </div>
  )
}

// ─── Test scores ─────────────────────────────────────────────────────────────

function ExpiryBadge({ expiresOn }) {
  if (!expiresOn) return null
  const days = daysUntil(expiresOn)
  if (days === null) return null
  if (days < 0) return <Badge tone="rose" icon={AlertTriangle}>Expired</Badge>
  if (days <= 45) return <Badge tone="rose">Expires in {days}d</Badge>
  if (days <= 120) return <Badge tone="amber">Expires in {days}d</Badge>
  return <Badge tone="sage">Valid</Badge>
}

function TestScoresSection({ profile, onSave }) {
  const list = profile?.testScores || []
  const [draft, setDraft] = useState({ type: TEST_TYPE.IELTS, score: '', takenOn: '' })

  // Validity is a known property of each test, so the expiry date computes
  // itself rather than asking the user to work it out.
  const computedExpiry = useMemo(() => {
    if (!draft.takenOn) return ''
    const years = TESTS[draft.type]?.validityYears
    if (!years) return ''
    const d = new Date(draft.takenOn)
    if (Number.isNaN(d.getTime())) return ''
    d.setFullYear(d.getFullYear() + years)
    return d.toISOString().slice(0, 10)
  }, [draft.takenOn, draft.type])

  const add = () => {
    if (!draft.score.trim() || !draft.takenOn) return
    onSave({
      testScores: [...list, { id: uid4(), ...draft, expiresOn: computedExpiry }],
    })
    setDraft({ type: TEST_TYPE.IELTS, score: '', takenOn: '' })
  }

  const remove = (id) => onSave({ testScores: list.filter(s => s.id !== id) })

  return (
    <div className="space-y-5">
      {list.length > 0 && (
        <ul className="space-y-2">
          {list.map(score => (
            <li key={score.id} className="group flex items-center gap-3 p-3 rounded-xl bg-ink-50">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-ink-800">{TESTS[score.type]?.label || score.type}</span>
                  <span className="text-sm font-medium text-ink-900 tabular-nums">{score.score}</span>
                  <ExpiryBadge expiresOn={score.expiresOn} />
                </div>
                <p className="text-xs text-ink-400 mt-0.5">
                  Taken {score.takenOn}{score.expiresOn ? ` · valid until ${score.expiresOn}` : ''}
                </p>
              </div>
              <button
                onClick={() => remove(score.id)}
                aria-label="Remove score"
                className="p-1.5 rounded-lg text-ink-400 hover:bg-rose-50 hover:text-rose-600
                           opacity-0 group-hover:opacity-100 focus-visible:opacity-100
                           transition-all duration-150 shrink-0"
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-ink-200 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Test">
            <Select value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value }))}>
              {Object.entries(TESTS).map(([value, meta]) => (
                <option key={value} value={value}>{meta.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Score">
            <Input value={draft.score} onChange={e => setDraft(d => ({ ...d, score: e.target.value }))}
              placeholder={`out of ${TESTS[draft.type]?.max ?? ''}`} />
          </Field>
          <Field label="Taken on">
            <Input type="date" max={todayInZone()} value={draft.takenOn}
              onChange={e => setDraft(d => ({ ...d, takenOn: e.target.value }))} />
          </Field>
        </div>

        {computedExpiry && (
          <p className="text-xs text-ink-500 bg-ink-50 rounded-lg px-3 py-2 leading-relaxed">
            {TESTS[draft.type]?.label} scores are valid for {TESTS[draft.type]?.validityYears} years,
            so this one expires on <strong>{computedExpiry}</strong>. PhDBench will warn you
            before it lapses.
          </p>
        )}

        <Button variant="primary" icon={Plus} onClick={add}
          disabled={!draft.score.trim() || !draft.takenOn}
          disabledReason="Enter the score and the date you took it.">
          Add score
        </Button>
      </div>
    </div>
  )
}

// ─── Credential evaluation ───────────────────────────────────────────────────

function CredentialSection({ profile, onSave }) {
  const list = profile?.credentialEvals || []
  const [draft, setDraft] = useState({ provider: EVAL_PROVIDER.WES, status: EVAL_STATUS.NOT_STARTED, refNumber: '' })

  const add = () => {
    onSave({ credentialEvals: [...list, { id: uid4(), ...draft }] })
    setDraft({ provider: EVAL_PROVIDER.WES, status: EVAL_STATUS.NOT_STARTED, refNumber: '' })
  }

  const setStatus = (id, status) =>
    onSave({ credentialEvals: list.map(e => e.id === id ? { ...e, status } : e) })

  const remove = (id) => onSave({ credentialEvals: list.filter(e => e.id !== id) })

  return (
    <div className="space-y-5">
      {list.length > 0 && (
        <ul className="space-y-2">
          {list.map(evaluation => (
            <li key={evaluation.id} className="group flex items-center gap-3 p-3 rounded-xl bg-ink-50">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-800">{evaluation.provider}</p>
                {evaluation.refNumber && (
                  <p className="text-xs text-ink-400 font-mono truncate">{evaluation.refNumber}</p>
                )}
              </div>
              <Select
                value={evaluation.status}
                onChange={e => setStatus(evaluation.id, e.target.value)}
                className="w-auto text-xs py-1.5 shrink-0"
                aria-label="Evaluation status"
              >
                {Object.entries(EVAL_STATUSES).map(([value, meta]) => (
                  <option key={value} value={value}>{meta.label}</option>
                ))}
              </Select>
              <button
                onClick={() => remove(evaluation.id)}
                aria-label="Remove evaluation"
                className="p-1.5 rounded-lg text-ink-400 hover:bg-rose-50 hover:text-rose-600
                           opacity-0 group-hover:opacity-100 transition-all duration-150 shrink-0"
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-ink-200 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Provider">
            <Select value={draft.provider} onChange={e => setDraft(d => ({ ...d, provider: e.target.value }))}>
              {Object.values(EVAL_PROVIDER).map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Reference number">
            <Input value={draft.refNumber} onChange={e => setDraft(d => ({ ...d, refNumber: e.target.value }))}
              placeholder="WES-0000000" />
          </Field>
        </div>
        <Button variant="primary" icon={Plus} onClick={add}>Track an evaluation</Button>
      </div>
    </div>
  )
}

// ─── Backup ──────────────────────────────────────────────────────────────────

function BackupSection({ uid, profile, counts }) {
  const toast = useToast()
  const mutate = useMutation()
  const [busy, setBusy] = useState(false)
  const [importing, setImporting] = useState(false)

  const lastExport = profile?.lastExportAt?.seconds
    ? new Date(profile.lastExportAt.seconds * 1000)
    : null
  const daysSince = lastExport
    ? Math.floor((Date.now() - lastExport.getTime()) / 86400000)
    : null

  const handleExport = async () => {
    setBusy(true)
    const r = await mutate(() => exportEverything(uid), { failure: 'Could not build your backup.' })
    if (r.ok) {
      const stamp = new Date().toISOString().slice(0, 10)
      downloadJSON(r.data, `phdbench-backup-${stamp}.json`)
      await saveProfile(uid, { lastExportAt: new Date() }).catch(() => {})
      toast.success(
        `Backup downloaded — ${r.data.counts.applications} applications, ${r.data.counts.leads} leads.`,
      )
    }
    setBusy(false)
  }

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const r = await mutate(() => importBackup(uid, payload), {
        failure: 'Could not import that file.',
      })
      if (r.ok) {
        toast.success(
          `Imported ${r.data.applications} applications and ${r.data.leads} leads. Nothing existing was touched.`,
        )
      }
    } catch {
      toast.error('That file could not be read. A PhDBench backup is a .json file exported from this page.')
    }
    setImporting(false)
    event.target.value = ''
  }

  return (
    <div className="space-y-5">
      <div className={cn(
        'rounded-xl p-4 border',
        daysSince === null || daysSince > 30
          ? 'bg-amber-50 border-amber-200'
          : 'bg-sage-50 border-sage-200',
      )}>
        <p className="text-sm leading-relaxed">
          {daysSince === null ? (
            <span className="text-amber-900">
              You have never exported a backup. Archive and undo protect you from
              mistakes inside the app — a backup is the only thing that protects you
              from losing the Firebase project itself.
            </span>
          ) : daysSince > 30 ? (
            <span className="text-amber-900">
              Your last backup was {daysSince} days ago.
            </span>
          ) : (
            <span className="text-sage-800">
              Last backed up {daysSince === 0 ? 'today' : `${daysSince} day${daysSince === 1 ? '' : 's'} ago`}.
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="primary" icon={Download} onClick={handleExport} loading={busy}>
          Export everything
        </Button>

        <label className={cn(
          'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer',
          'bg-white text-ink-700 border border-ink-200 hover:bg-ink-50 hover:border-ink-300',
          'active:scale-[0.97] transition-all duration-150',
          importing && 'opacity-50 pointer-events-none',
        )}>
          <Upload size={15} aria-hidden="true" />
          {importing ? 'Importing…' : 'Import a backup'}
          <input type="file" accept="application/json,.json" onChange={handleImport} className="sr-only" />
        </label>
      </div>

      <p className="text-xs text-ink-400 leading-relaxed max-w-prose">
        The export is plain JSON containing every lead, application, follow-up,
        activity entry and document — archived records included — and is readable
        without this app. Importing is additive: it adds records alongside what you
        already have and never overwrites anything.
      </p>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const uid = useUid()
  const { user } = useAuth()
  const { profile, applications, leads, documents } = useData()
  const toast = useToast()
  const mutate = useMutation()
  const [searchParams] = useSearchParams()

  const [name, setName] = useState('')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    setName(profile?.displayName || user?.displayName?.split(' ')[0] || '')
  }, [profile?.displayName, user])

  const patchProfile = (patch) =>
    mutate(() => saveProfile(uid, patch), { failure: 'Could not save that.' })

  const handleSaveName = async () => {
    setSavingName(true)
    await mutate(() => saveProfile(uid, { displayName: name.trim() }), {
      success: 'Saved.',
      failure: 'Could not save your name.',
    })
    setSavingName(false)
  }

  const needsMigration = applications.some(a => !a.schemaVersion) || leads.some(l => !l.schemaVersion)

  const handleMigrate = async () => {
    const r = await mutate(() => migrateToV2(uid), { failure: 'Migration failed.' })
    if (r.ok) {
      toast.success(
        `Updated ${r.data.applications} applications and ${r.data.leads} leads. Each one is flagged for you to confirm its real stage — nothing was guessed.`,
      )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink-900">Settings</h1>
        <p className="text-ink-500 text-sm mt-1">Make it yours.</p>
      </div>

      {needsMigration && (
        <div className="bg-white rounded-2xl border border-sky-200 shadow-surface p-5">
          <div className="flex items-start gap-3">
            <Database size={18} className="text-sky-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="font-medium text-ink-900">Some records use the old format</h2>
              <p className="text-sm text-ink-500 mt-1 leading-relaxed max-w-prose">
                Updating them is lossless — the old status is kept, and every application
                is flagged so you can confirm its real stage yourself. PhDBench will not
                guess whether something was actually submitted.
              </p>
              <Button variant="primary" onClick={handleMigrate} className="mt-4">
                Update my records
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card icon={SettingsIcon} title="You"
        description="What PhDBench calls you, and which account owns this data.">
        <div className="space-y-4">
          <Field label="Preferred name">
            <div className="flex gap-2">
              <Input value={name} onChange={e => setName(e.target.value)}
                placeholder="Nikhil" aria-label="Preferred name" />
              <Button variant="secondary" onClick={handleSaveName} loading={savingName}
                disabled={!name.trim()} disabledReason="Enter a name first.">
                Save
              </Button>
            </div>
          </Field>

          <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-ink-50">
            <div className="min-w-0">
              <p className="text-xs text-ink-400 uppercase tracking-wider">Signed in as</p>
              <p className="text-sm text-ink-800 truncate mt-0.5">{user?.email}</p>
            </div>
            <Badge tone="sage" icon={ShieldCheck}>Owner</Badge>
          </div>
        </div>
      </Card>

      <Card icon={FileText} title="Documents" delay={0.05}
        description="The checklist that appears on every application.">
        <DocumentsManager />
      </Card>

      <Card icon={Mails} title="Recommenders" delay={0.1}
        description="Who writes your letters. Saved once here, then tracked per application — because a letter that never arrives is the quietest way an application dies.">
        <RecommendersSection profile={profile} onSave={patchProfile} />
      </Card>

      <Card icon={GraduationCap} title="Test scores" delay={0.15}
        description="English and aptitude scores expire — IELTS, TOEFL and Duolingo after two years, GRE after five. PhDBench works out the expiry date and warns you before a score lapses mid-cycle.">
        <TestScoresSection profile={profile} onSave={patchProfile} />
      </Card>

      <Card icon={ShieldCheck} title="Credential evaluation" delay={0.2}
        description="WES, ECE and similar evaluations routinely take four to six weeks, and many US programmes will not review an application without one.">
        <CredentialSection profile={profile} onSave={patchProfile} />
      </Card>

      <Card icon={Database} title="Backup" delay={0.25}
        description="Your own copy, on your own disk.">
        <BackupSection uid={uid} profile={profile} counts={{ applications: applications.length, leads: leads.length }} />
      </Card>
    </div>
  )
}
