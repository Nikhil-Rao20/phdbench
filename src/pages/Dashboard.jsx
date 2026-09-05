import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Lightbulb, FileText, Send, Trophy, ArrowRight,
  CalendarClock, Plus, Wallet,
} from 'lucide-react'
import { useData } from '../hooks/useData'
import { useAuth } from '../hooks/useAuth'
import { computeAttention, attentionCounts } from '../lib/attention'
import { submittedApplications, preparingApplications, responseRate } from '../lib/derive'
import { STAGE, STAGES, STAGE_ORDER } from '../lib/model'
import { describeDeadline, isOverdue } from '../lib/datetime'
import AttentionPanel from '../components/AttentionPanel'
import { PageSkeleton } from '../components/Skeleton'
import { Button, EmptyState, Tooltip, cn, toneOf } from '../components/ui'
import {
  StageBadge, DeadlineDisplay, UrgencyDot, CountryChip,
  feeInINR, formatINR,
} from '../components/domain'

function StatCard({ label, value, sub, icon: Icon, tone = 'ink', to, delay = 0 }) {
  const t = toneOf(tone)
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={to}
        className="group block bg-white rounded-2xl border border-ink-100 shadow-surface
                   hover:shadow-raised hover:border-ink-200 p-5
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400
                   transition-all duration-200"
      >
        <div className="flex items-center justify-between mb-3">
          <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center', t.solid)}>
            <Icon size={17} className="text-white" aria-hidden="true" />
          </span>
          <ArrowRight
            size={15}
            className="text-ink-200 group-hover:text-ink-500 group-hover:translate-x-0.5
                       transition-all duration-150"
            aria-hidden="true"
          />
        </div>
        <div className="font-display text-3xl text-ink-900 tabular-nums leading-none">{value}</div>
        <div className="text-ink-600 text-sm mt-1.5">{label}</div>
        {/* Charter #2: a number alone means little; the sub-line gives it context. */}
        {sub && <div className="text-ink-400 text-xs mt-0.5">{sub}</div>}
      </Link>
    </motion.div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { loading, applications, leads, documents, profile } = useData()
  const navigate = useNavigate()

  const attention = useMemo(
    () => computeAttention({ applications, leads, documents, profile }),
    [applications, leads, documents, profile],
  )
  const counts = useMemo(() => attentionCounts(attention), [attention])

  const sent = submittedApplications(applications)
  const preparing = preparingApplications(applications)
  const offers = applications.filter(a => a.stage === STAGE.OFFER)
  const response = responseRate(applications)

  // Everything with a live deadline, applications and leads together, so a lead
  // about to expire is as visible as an application in progress.
  const upcoming = useMemo(() => {
    const entries = []
    const push = (record, kind) => {
      if (!record.deadline || isOverdue(record.deadline)) return
      const d = describeDeadline(record.deadline)
      if (d) entries.push({ record, kind, d })
    }
    applications.forEach(a => push(a, 'application'))
    leads.filter(l => (l.state || 'active') === 'active').forEach(l => push(l, 'lead'))
    return entries.sort((a, b) => a.d.instant - b.d.instant).slice(0, 6)
  }, [applications, leads])

  const cycleSpendINR = useMemo(
    () => applications.reduce((sum, a) => sum + (a.fee?.waiverGranted ? 0 : feeInINR(a.fee)), 0),
    [applications],
  )

  if (loading) return <PageSkeleton />

  const firstName = profile?.displayName || user?.displayName?.split(' ')[0] || 'there'
  const isEmpty = applications.length === 0 && leads.length === 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-ink-400 text-sm mb-1">Good to have you back,</p>
        <h1 className="font-display text-3xl sm:text-4xl text-ink-900">{firstName} 👋</h1>
        <p className="text-ink-500 text-sm mt-2 max-w-prose leading-relaxed">
          {isEmpty
            ? 'Nothing tracked yet. Save a lead when you spot a position, and convert it when you decide to apply.'
            : preparing.length > 0
              ? `${sent.length} application${sent.length === 1 ? '' : 's'} sent · ${preparing.length} still being prepared.`
              : `${sent.length} application${sent.length === 1 ? '' : 's'} out in the world.`}
        </p>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Lightbulb}
          title="Start with a lead"
          description="When you find a position on LinkedIn, a lab site or from a friend, save it as a lead. It takes fifteen seconds, and you can turn it into a full application whenever you decide to go for it."
          action={<Button variant="primary" icon={Plus} onClick={() => navigate('/leads')}>Save your first lead</Button>}
          secondaryAction={<Button variant="secondary" icon={FileText} onClick={() => navigate('/applications')}>Add an application directly</Button>}
        />
      ) : (
        <>
          {/* The most important thing on the page, so it comes first. */}
          <AttentionPanel
            items={attention}
            counts={counts}
            onOpenApplication={(id) => navigate(`/applications?open=${id}`)}
          />

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Active leads"
              value={leads.filter(l => (l.state || 'active') === 'active').length}
              sub={`${leads.length} saved in total`}
              icon={Lightbulb} tone="sky" to="/leads" delay={0}
            />
            <StatCard
              label="In preparation"
              value={preparing.length}
              sub={preparing.length ? 'not sent yet' : 'nothing in the drawer'}
              icon={FileText} tone="amber" to="/applications" delay={0.05}
            />
            <StatCard
              label="Submitted"
              value={sent.length}
              sub={response ? `${response.rate}% response rate` : 'no responses yet'}
              icon={Send} tone="sage" to="/applications" delay={0.1}
            />
            <StatCard
              label="Offers"
              value={offers.length}
              sub={offers.length ? 'congratulations' : 'still waiting'}
              icon={Trophy} tone={offers.length ? 'success' : 'ink'} to="/applications" delay={0.15}
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Upcoming deadlines */}
            <motion.section
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="lg:col-span-2 bg-white rounded-2xl border border-ink-100 shadow-surface p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg text-ink-900">What is coming</h2>
                <Link
                  to="/deadlines"
                  className="text-xs text-sage-700 hover:text-sage-800 hover:underline
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-300 rounded"
                >
                  All deadlines
                </Link>
              </div>

              {upcoming.length === 0 ? (
                <div className="text-center py-10">
                  <CalendarClock size={26} className="mx-auto mb-3 text-ink-200" aria-hidden="true" />
                  <p className="text-sm text-ink-500">No deadlines ahead.</p>
                  <p className="text-xs text-ink-400 mt-1">
                    Add dates to your applications and they will appear here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-1 -mx-2">
                  {upcoming.map(({ record, kind, d }) => (
                    <li key={`${kind}-${record.id}`}>
                      <button
                        onClick={() => navigate(kind === 'lead' ? '/leads' : `/applications?open=${record.id}`)}
                        className="w-full text-left flex items-center gap-3 p-3 rounded-xl
                                   hover:bg-ink-50 active:bg-ink-100
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-300
                                   transition-colors duration-120"
                      >
                        <UrgencyDot value={record.deadline} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="text-sm font-medium text-ink-800 truncate">
                              {record.university}
                            </span>
                            {kind === 'lead' && (
                              <span className="text-2xs uppercase tracking-wider text-sky-600 shrink-0">lead</span>
                            )}
                          </span>
                          <span className="block text-xs text-ink-500 truncate mt-0.5">
                            {record.labName || record.professor || '—'}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <DeadlineDisplay value={record.deadline} compact />
                          {d.crossesDay && (
                            <span className="block text-2xs text-sky-600 mt-0.5">
                              {d.homeDate} your time
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>

            {/* Pipeline + spend */}
            <motion.aside
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl border border-ink-100 shadow-surface p-5">
                <h2 className="font-display text-lg text-ink-900 mb-4">Pipeline</h2>
                <ul className="space-y-2.5">
                  {STAGE_ORDER.filter(s => applications.some(a => a.stage === s)).map(stage => {
                    const count = applications.filter(a => a.stage === stage).length
                    const pct = Math.round((count / applications.length) * 100)
                    const meta = STAGES[stage]
                    return (
                      <li key={stage} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 text-xs text-ink-600 truncate" title={meta.help}>
                          {meta.short}
                        </span>
                        <span className="flex-1 h-2 bg-ink-100 rounded-full overflow-hidden shadow-inset">
                          <motion.span
                            className={cn('block h-full rounded-full', toneOf(meta.tone).solid)}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(pct, 6)}%` }}
                            transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </span>
                        <span className="w-5 text-right text-sm font-medium text-ink-800 tabular-nums shrink-0">
                          {count}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>

              {cycleSpendINR > 0 && (
                <div className="bg-white rounded-2xl border border-ink-100 shadow-surface p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet size={15} className="text-ink-400" aria-hidden="true" />
                    <h2 className="text-xs font-semibold text-ink-400 uppercase tracking-widest">
                      This cycle
                    </h2>
                  </div>
                  <div className="font-display text-2xl text-ink-900 tabular-nums">
                    {formatINR(cycleSpendINR)}
                  </div>
                  <p className="text-xs text-ink-400 mt-1 leading-relaxed">
                    in application fees across {applications.filter(a => feeInINR(a.fee) > 0).length} applications
                  </p>
                </div>
              )}
            </motion.aside>
          </div>
        </>
      )}
    </div>
  )
}
