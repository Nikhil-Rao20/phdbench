// src/pages/RequestAccessPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The front door for everyone who is not yet approved.
//
// Three states live here because they are the same conversation at different
// points: asking, waiting, and having been refused. Splitting them into separate
// routes would mean a signed-in stranger could land on a page that assumes a
// state they are not in.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap, Send, Clock, CheckCircle2, XCircle, LogOut, Pencil, ExternalLink,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAccess } from '../hooks/useAccess'
import { useToast, useMutation } from '../hooks/useToast'
import { requestAccess, updateMyRequest } from '../lib/groupsDb'
import { ACCESS } from '../lib/access'
import { FIELD_LIMITS, isSafeUrl } from '../lib/safety'
import { Button, cn } from '../components/ui'
import { Field, Input, Select, TextArea, Segmented } from '../components/form'

const POSITIONS = [
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'masters',       label: "Master's student" },
  { value: 'phd',           label: 'PhD student' },
  { value: 'research_staff',label: 'Research assistant / staff' },
  { value: 'working',       label: 'Working professional' },
  { value: 'other',         label: 'Other' },
]

const APPLYING_TO = [
  { value: 'foreign', label: 'Abroad' },
  { value: 'india',   label: 'India' },
  { value: 'both',    label: 'Both' },
]

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl"
      >
        {children}
      </motion.div>
    </div>
  )
}

function Header({ icon: Icon, tone, title, children }) {
  const tones = {
    sage: 'bg-sage-50 text-sage-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  }
  return (
    <div className="flex items-start gap-4 mb-6">
      <span className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0', tones[tone])}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h1 className="font-display text-2xl text-ink-900 leading-tight">{title}</h1>
        <p className="text-sm text-ink-500 mt-1.5 leading-relaxed">{children}</p>
      </div>
    </div>
  )
}

function SignedInAs({ user, onSignOut }) {
  return (
    <div className="flex items-center gap-3 mt-6 pt-5 border-t border-ink-100">
      {user?.photoURL
        ? <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
        : <span className="w-8 h-8 rounded-full bg-ink-200 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-400">Signed in as</p>
        <p className="text-sm text-ink-700 truncate">{user?.email}</p>
      </div>
      <button
        onClick={onSignOut}
        className="shrink-0 inline-flex items-center gap-1.5 text-xs text-ink-500
                   hover:text-ink-900 px-3 py-2 rounded-lg hover:bg-ink-100
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400
                   transition-colors duration-150"
      >
        <LogOut size={13} aria-hidden="true" /> Sign out
      </button>
    </div>
  )
}

// ─── The form ────────────────────────────────────────────────────────────────

function RequestForm({ user, existing, onDone }) {
  const mutate = useMutation()
  const toast = useToast()

  const [form, setForm] = useState({
    name: existing?.name || user?.displayName || '',
    link: existing?.link || '',
    position: existing?.position || 'undergraduate',
    location: existing?.location || '',
    applyingFor: existing?.applyingFor || '',
    applyingTo: existing?.applyingTo || 'foreign',
    heardFrom: existing?.heardFrom || '',
    note: existing?.note || '',
  })
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const errors = {
    name: !form.name.trim() ? 'Your name, so it is clear who is asking.' : null,
    link: !form.link.trim()
      ? 'A link helps confirm you are a real applicant.'
      : !isSafeUrl(form.link)
        ? 'That does not look like a web address. It should start with https://'
        : null,
    location: !form.location.trim() ? 'Where are you based?' : null,
    applyingFor: !form.applyingFor.trim() ? 'One line is enough.' : null,
    heardFrom: !form.heardFrom.trim() ? 'How did you come across PhDBench?' : null,
  }
  const valid = Object.values(errors).every(e => e === null)

  const submit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (!valid) return

    setBusy(true)
    const r = await mutate(
      () => (existing ? updateMyRequest(user.uid, form) : requestAccess(user, form)),
      { failure: 'Could not send your request. Check your connection and try again.' },
    )
    setBusy(false)
    if (r.ok) {
      toast.success(existing ? 'Your request has been updated.' : 'Request sent.')
      onDone?.()
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Your name" required error={touched ? errors.name : null}>
          <Input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            maxLength={FIELD_LIMITS.name}
            placeholder="Nikhil Rao"
            autoComplete="name"
          />
        </Field>

        <Field label="Where are you based" required error={touched ? errors.location : null}
          hint="City and country">
          <Input
            value={form.location}
            onChange={e => set('location', e.target.value)}
            maxLength={FIELD_LIMITS.location}
            placeholder="Hyderabad, India"
          />
        </Field>
      </div>

      <Field label="Currently" required>
        <Select value={form.position} onChange={e => set('position', e.target.value)}>
          {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </Select>
      </Field>

      <Field
        label="A link — portfolio, Google Scholar, LinkedIn or GitHub"
        required
        error={touched ? errors.link : null}
      >
        <Input
          value={form.link}
          onChange={e => set('link', e.target.value)}
          maxLength={FIELD_LIMITS.url}
          placeholder="https://scholar.google.com/citations?user=…"
          inputMode="url"
        />
      </Field>

      <Field label="What are you applying for" required error={touched ? errors.applyingFor : null}
        hint="Field and intake, in one line">
        <Input
          value={form.applyingFor}
          onChange={e => set('applyingFor', e.target.value)}
          maxLength={FIELD_LIMITS.applyingFor}
          placeholder="Computer Vision PhD, Fall 2027"
        />
      </Field>

      <Field label="Applying to" required>
        <Segmented
          value={form.applyingTo}
          onChange={v => set('applyingTo', v)}
          options={APPLYING_TO}
        />
      </Field>

      <Field label="How did you hear about PhDBench" required error={touched ? errors.heardFrom : null}>
        <Input
          value={form.heardFrom}
          onChange={e => set('heardFrom', e.target.value)}
          maxLength={FIELD_LIMITS.heardFrom}
          placeholder="LinkedIn post, a friend, search…"
        />
      </Field>

      <Field label="Anything else" hint="Optional">
        <TextArea
          rows={3}
          value={form.note}
          onChange={e => set('note', e.target.value)}
          maxLength={FIELD_LIMITS.requestNote}
          placeholder="Only if there is something worth saying."
        />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="submit"
          variant="primary"
          icon={Send}
          loading={busy}
          disabled={touched && !valid}
          disabledReason="Fill in the required fields above."
        >
          {existing ? 'Update my request' : 'Request access'}
        </Button>
      </div>
    </form>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RequestAccessPage() {
  const { user, logout } = useAuth()
  const { request, state } = useAccess()
  const [editing, setEditing] = useState(false)

  const card = 'bg-white rounded-3xl border border-ink-100 shadow-raised p-6 sm:p-8'

  if (state === ACCESS.PENDING && !editing) {
    return (
      <Shell>
        <div className={card}>
          <Header icon={Clock} tone="amber" title="Your request is with Nikhil">
            He reviews these himself, so it is a person reading it rather than a
            system approving it. You will get in as soon as he does — this page
            updates on its own, nothing to refresh.
          </Header>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              ['Name', request?.name],
              ['Based in', request?.location],
              ['Applying for', request?.applyingFor],
              ['Link', request?.link],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="bg-ink-50 rounded-xl p-3 min-w-0">
                <dt className="text-xs text-ink-400">{label}</dt>
                <dd className="text-ink-800 truncate mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5">
            <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
              Change my answers
            </Button>
          </div>

          <SignedInAs user={user} onSignOut={logout} />
        </div>
      </Shell>
    )
  }

  if (state === ACCESS.REJECTED && !editing) {
    return (
      <Shell>
        <div className={card}>
          <Header icon={XCircle} tone="rose" title="Not approved">
            Nikhil has not granted access to this account.
            {request?.decisionNote ? ` He said: “${request.decisionNote}”` : ''}
          </Header>
          <p className="text-sm text-ink-500 leading-relaxed">
            If you think this was a mistake, or your circumstances have changed,
            you can revise your answers and it will go back into the queue.
          </p>
          <div className="mt-5">
            <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
              Revise and ask again
            </Button>
          </div>
          <SignedInAs user={user} onSignOut={logout} />
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className={card}>
        <Header icon={GraduationCap} tone="sage"
          title={editing ? 'Update your request' : 'Ask for access'}>
          PhDBench is a PhD application tracker — shared leads with the people you
          trust, and an application tracker that stays private to you. Access is
          approved by hand so it stays free to run, which means a few questions
          first.
        </Header>

        <RequestForm
          user={user}
          existing={editing ? request : null}
          onDone={() => setEditing(false)}
        />

        <SignedInAs user={user} onSignOut={logout} />
      </div>
    </Shell>
  )
}
