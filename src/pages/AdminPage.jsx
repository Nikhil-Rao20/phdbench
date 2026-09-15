// src/pages/AdminPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The approval queue. Visible only to the administrator.
//
// The route is hidden for everyone else, but that is a courtesy, not the
// defence — `firestore.rules` refuses to list the queue for anybody but the
// admin, so a non-admin who typed the URL would see an empty screen and an
// error rather than other people's submissions.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, ExternalLink, Users,
  Search, Inbox, MapPin, GraduationCap, Globe2,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAccess } from '../hooks/useAccess'
import { useMutation, useToast } from '../hooks/useToast'
import { subscribeAccessRequests, approveRequest, rejectRequest } from '../lib/groupsDb'
import { ACCESS, isAdmin } from '../lib/access'
import { hostOf } from '../lib/safety'
import { Button, Badge, EmptyState, SafeLink, Tooltip, cn } from '../components/ui'
import { Input } from '../components/form'
import { RowSkeleton } from '../components/Skeleton'

const POSITION_LABELS = {
  undergraduate: 'Undergraduate',
  masters: "Master's",
  phd: 'PhD student',
  research_staff: 'Research staff',
  working: 'Working professional',
  other: 'Other',
}

const APPLYING_LABELS = { foreign: 'Abroad', india: 'India', both: 'India & abroad' }

const TABS = [
  { value: ACCESS.PENDING,  label: 'Waiting',  icon: Clock },
  { value: ACCESS.APPROVED, label: 'Approved', icon: CheckCircle2 },
  { value: ACCESS.REJECTED, label: 'Refused',  icon: XCircle },
]

function Fact({ icon: Icon, children }) {
  if (!children) return null
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-500 min-w-0">
      <Icon size={12} className="shrink-0" aria-hidden="true" />
      <span className="truncate">{children}</span>
    </span>
  )
}

function RequestCard({ request, index, onApprove, onReject, busy }) {
  const host = hostOf(request.link)

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: Math.min(index * 0.03, 0.15), duration: 0.22 }}
      className="bg-white rounded-2xl border border-ink-100 shadow-surface p-5"
    >
      <div className="flex items-start gap-3">
        {request.photoURL
          ? <img src={request.photoURL} alt="" referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover shrink-0" />
          : <span className="w-10 h-10 rounded-full bg-ink-100 shrink-0" />}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-medium text-ink-900 truncate">{request.name || request.googleName}</h3>
              <p className="text-xs text-ink-400 truncate">{request.email}</p>
            </div>
            {request.status === ACCESS.APPROVED && <Badge tone="sage" icon={CheckCircle2}>Approved</Badge>}
            {request.status === ACCESS.REJECTED && <Badge tone="rose" icon={XCircle}>Refused</Badge>}
            {request.status === ACCESS.PENDING && <Badge tone="amber" icon={Clock}>Waiting</Badge>}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
            <Fact icon={GraduationCap}>{POSITION_LABELS[request.position] || request.position}</Fact>
            <Fact icon={MapPin}>{request.location}</Fact>
            <Fact icon={Globe2}>{APPLYING_LABELS[request.applyingTo]}</Fact>
          </div>

          {request.applyingFor && (
            <p className="text-sm text-ink-700 mt-3 bg-ink-50 rounded-xl px-3 py-2 leading-relaxed">
              {request.applyingFor}
            </p>
          )}

          {request.note && (
            <p className="text-sm text-ink-600 mt-2 leading-relaxed">“{request.note}”</p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-3">
            {host && (
              // The link is a stranger's input, so it goes through SafeLink and
              // is labelled with its real host rather than its link text.
              <SafeLink
                href={request.link}
                className="inline-flex items-center gap-1.5 text-xs text-sky-700 hover:underline"
              >
                <ExternalLink size={11} aria-hidden="true" /> {host}
              </SafeLink>
            )}
            {request.heardFrom && (
              <span className="text-xs text-ink-400">via {request.heardFrom}</span>
            )}
          </div>

          {request.status === ACCESS.PENDING && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-ink-100">
              <Button size="sm" variant="primary" icon={CheckCircle2}
                loading={busy === `approve-${request.id}`}
                onClick={() => onApprove(request)}>
                Approve
              </Button>
              <Button size="sm" variant="ghost" icon={XCircle}
                loading={busy === `reject-${request.id}`}
                onClick={() => onReject(request)}
                className="text-rose-600 hover:bg-rose-50">
                Refuse
              </Button>
            </div>
          )}

          {request.status !== ACCESS.PENDING && (
            <div className="mt-4 pt-3 border-t border-ink-100">
              <Button size="sm" variant="ghost"
                loading={busy === `toggle-${request.id}`}
                onClick={() => (request.status === ACCESS.APPROVED ? onReject(request) : onApprove(request))}>
                {request.status === ACCESS.APPROVED ? 'Revoke access' : 'Approve after all'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.li>
  )
}

export default function AdminPage() {
  const { user } = useAuth()
  const { admin } = useAccess()
  const mutate = useMutation()
  const toast = useToast()

  const [requests, setRequests] = useState(null)
  const [tab, setTab] = useState(ACCESS.PENDING)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    if (!admin) return undefined
    return subscribeAccessRequests(
      setRequests,
      () => {
        setRequests([])
        toast.error('Could not load the access queue. Check that the rules are published.')
      },
    )
  }, [admin, toast])

  const counts = useMemo(() => {
    const list = requests || []
    return {
      [ACCESS.PENDING]: list.filter(r => r.status === ACCESS.PENDING).length,
      [ACCESS.APPROVED]: list.filter(r => r.status === ACCESS.APPROVED).length,
      [ACCESS.REJECTED]: list.filter(r => r.status === ACCESS.REJECTED).length,
    }
  }, [requests])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (requests || [])
      .filter(r => r.status === tab)
      .filter(r => !q || [r.name, r.email, r.location, r.applyingFor]
        .some(v => String(v || '').toLowerCase().includes(q)))
  }, [requests, tab, search])

  // Defence in depth: the route is hidden, the rules refuse the data, and this
  // refuses to render. Any one of the three failing is not enough.
  if (!admin || !isAdmin(user)) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Not available"
        description="This area belongs to the administrator."
      />
    )
  }

  const handleApprove = async (request) => {
    setBusy(`approve-${request.id}`)
    const r = await mutate(() => approveRequest(request.id, user.uid),
      { failure: 'Could not approve that request.' })
    if (r.ok) toast.success(`${request.name || request.email} can now use PhDBench.`)
    setBusy(null)
  }

  const handleReject = async (request) => {
    setBusy(`reject-${request.id}`)
    const r = await mutate(() => rejectRequest(request.id, user.uid),
      { failure: 'Could not refuse that request.' })
    if (r.ok) toast.info(`${request.name || request.email} has not been given access.`)
    setBusy(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-3xl text-ink-900">Access</h1>
          <Badge tone="ink" icon={ShieldCheck}>Admin</Badge>
        </div>
        <p className="text-ink-500 text-sm mt-1 max-w-prose leading-relaxed">
          Everyone who asks to use PhDBench appears here. Approving grants a
          private workspace of their own — it does not put them in any of your
          groups; you invite them to those separately.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium',
              'transition-all duration-150 active:scale-[0.97]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400',
              tab === t.value
                ? 'bg-ink-900 text-white'
                : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50',
            )}
          >
            <t.icon size={14} aria-hidden="true" />
            {t.label}
            <span className={cn(
              'tabular-nums text-xs px-1.5 py-0.5 rounded-md',
              tab === t.value ? 'bg-white/15' : 'bg-ink-100 text-ink-500',
            )}>
              {counts[t.value]}
            </span>
          </button>
        ))}
      </div>

      {(requests?.length ?? 0) > 6 && (
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, location…"
            className="pl-10"
            aria-label="Search requests"
          />
        </div>
      )}

      {requests === null ? (
        <div className="space-y-2">{Array.from({ length: 3 }, (_, i) => <RowSkeleton key={i} />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={tab === ACCESS.PENDING ? 'Nobody waiting' : `Nothing ${tab === ACCESS.APPROVED ? 'approved' : 'refused'} yet`}
          description={
            tab === ACCESS.PENDING
              ? 'When someone signs in and asks for access, their request appears here for you to read.'
              : 'Requests you have decided on will be listed here.'
          }
        />
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {visible.map((request, i) => (
              <RequestCard
                key={request.id}
                request={request}
                index={i}
                busy={busy}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
