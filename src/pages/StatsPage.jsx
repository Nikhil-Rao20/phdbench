import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { BarChart3, Info } from 'lucide-react'
import { useData } from '../hooks/useData'
import {
  submittedApplications, preparingApplications, responseRate,
  emailReplyRate, docsProgress,
} from '../lib/derive'
import { STAGES, STAGE_ORDER, PRIORITIES, countryByCode } from '../lib/model'
import { feeInINR, formatINR } from '../components/domain'
import { PageSkeleton } from '../components/Skeleton'
import { EmptyState, SectionTitle, Tooltip, cn, toneOf } from '../components/ui'

const TONE_HEX = {
  ink: '#978d76', sage: '#448d65', success: '#22c55e',
  amber: '#e8ad2a', rose: '#f43f5e', sky: '#38bdf8',
}

const AREA_COLORS = ['#448d65', '#e8ad2a', '#38bdf8', '#f43f5e', '#a78bfa', '#fb923c', '#22c55e', '#94a3b8']

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-float p-3 text-sm">
      {label && <div className="text-ink-500 text-xs mb-1 capitalize">{label}</div>}
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} aria-hidden="true" />
          <span className="text-ink-700">{p.name}:</span>
          <span className="font-medium text-ink-900 tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Charter #2: a bare percentage means nothing. Every headline number carries
 * the fraction it came from, so "50%" cannot hide the fact that it is one out
 * of two.
 */
function StatCard({ label, value, context, note, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-white rounded-2xl border border-ink-100 shadow-surface p-5"
    >
      <div className="font-display text-3xl text-ink-900 tabular-nums leading-none">{value}</div>
      <div className="text-ink-700 text-sm font-medium mt-2">{label}</div>
      {context && <div className="text-ink-400 text-xs mt-0.5">{context}</div>}
      {note && (
        <Tooltip label={note}>
          <span className="inline-flex items-center gap-1 text-2xs text-ink-300 mt-1.5">
            <Info size={10} aria-hidden="true" /> how this is counted
          </span>
        </Tooltip>
      )}
    </motion.div>
  )
}

function Panel({ title, children, delay = 0, className }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn('bg-white rounded-2xl border border-ink-100 shadow-surface p-5', className)}
    >
      <SectionTitle>{title}</SectionTitle>
      {children}
    </motion.section>
  )
}

export default function StatsPage() {
  const { loading, applications, leads, documents } = useData()

  const sent = submittedApplications(applications)
  const preparing = preparingApplications(applications)
  const response = responseRate(applications)
  const replies = emailReplyRate(applications)

  const stageData = useMemo(() => STAGE_ORDER
    .map(stage => ({
      name: STAGES[stage].short,
      value: applications.filter(a => a.stage === stage).length,
      color: TONE_HEX[STAGES[stage].tone] || TONE_HEX.ink,
    }))
    .filter(d => d.value > 0), [applications])

  const countryData = useMemo(() => {
    const counts = {}
    applications.forEach(a => {
      const name = countryByCode(a.country)?.name || 'Unspecified'
      counts[name] = (counts[name] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: AREA_COLORS[i % AREA_COLORS.length] }))
  }, [applications])

  const areaData = useMemo(() => {
    const counts = {}
    applications.forEach(a => {
      const name = a.researchArea || 'Unspecified'
      counts[name] = (counts[name] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: AREA_COLORS[i % AREA_COLORS.length] }))
  }, [applications])

  const monthly = useMemo(() => {
    const out = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const month = d.toLocaleString('default', { month: 'short' })
      const count = applications.filter(a => {
        // Count when it was *sent*, not when the card was created — those are
        // different events, and only one of them is an application.
        const stamp = a.submittedAt?.seconds
        if (!stamp) return false
        const sentDate = new Date(stamp * 1000)
        return sentDate.getMonth() === d.getMonth() && sentDate.getFullYear() === d.getFullYear()
      }).length
      out.push({ month, count })
    }
    return out
  }, [applications])

  const spend = useMemo(() => {
    const paid = applications.reduce((sum, a) => sum + (a.fee?.waiverGranted ? 0 : feeInINR(a.fee)), 0)
    const waived = applications.filter(a => a.fee?.waiverGranted).length
    return { paid, waived }
  }, [applications])

  const docStats = useMemo(() => {
    if (sent.length === 0) return []
    return documents.map(doc => {
      const requiredBy = applications.filter(a => (a.requiredDocs || []).includes(doc.id))
      const submitted = requiredBy.filter(a => (a.submittedDocs || a.docs || {})[doc.id]).length
      return {
        id: doc.id,
        name: doc.name,
        requiredBy: requiredBy.length,
        submitted,
        // Measured against the applications that actually ask for it, not
        // against every application — the old version divided by the total,
        // which made a rarely-required document look like a failure.
        percentage: requiredBy.length ? Math.round((submitted / requiredBy.length) * 100) : 0,
      }
    }).filter(d => d.requiredBy > 0).sort((a, b) => b.percentage - a.percentage)
  }, [documents, applications, sent.length])

  if (loading) return <PageSkeleton />

  if (applications.length === 0 && leads.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl text-ink-900">Stats</h1>
        <EmptyState
          icon={BarChart3}
          title="Nothing to measure yet"
          description="Once you have leads and applications, this page shows where they stand, how they are distributed, and what the cycle is costing you."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink-900">Stats</h1>
        <p className="text-ink-500 text-sm mt-1 max-w-prose leading-relaxed">
          Only applications you have marked <strong>submitted</strong> or later count
          as sent. Drafts are counted separately, so starting a new one never makes
          your numbers look worse.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Leads saved" value={leads.length}
          context={`${leads.filter(l => (l.state || 'active') === 'active').length} still active`} delay={0} />
        <StatCard label="Submitted" value={sent.length}
          context={preparing.length ? `${preparing.length} still in preparation` : 'nothing in the drawer'}
          note="Counts applications at Submitted, Under review, Interview, Offer, Waitlist, Rejected, Withdrawn or Missed."
          delay={0.05} />
        <StatCard
          label="Response rate"
          value={response ? `${response.rate}%` : '—'}
          context={response ? `${response.responded} of ${response.sent} sent` : 'nothing sent yet'}
          note="Interview, offer or waitlist, over applications actually submitted."
          delay={0.1}
        />
        <StatCard
          label="Email replies"
          value={replies ? `${replies.rate}%` : '—'}
          context={replies ? `${replies.replied} of ${replies.sent} emailed` : 'no outreach yet'}
          note="Counted over applications where you recorded sending an email."
          delay={0.15}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Where everything stands" delay={0.2}>
          {stageData.length === 0 ? (
            <p className="text-ink-400 text-sm text-center py-8">No applications yet.</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ResponsiveContainer width="100%" height={190} className="max-w-[190px]">
                <PieChart>
                  <Pie data={stageData} cx="50%" cy="50%" innerRadius={48} outerRadius={78}
                    paddingAngle={3} dataKey="value">
                    {stageData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <RTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="flex-1 space-y-1.5 w-full">
                {stageData.map(d => (
                  <li key={d.name} className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} aria-hidden="true" />
                    <span className="text-ink-600 flex-1 truncate">{d.name}</span>
                    <span className="font-medium text-ink-900 tabular-nums">{d.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <Panel title="Countries" delay={0.25}>
          {countryData.length === 0 ? (
            <p className="text-ink-400 text-sm text-center py-8">No applications yet.</p>
          ) : (
            <ul className="space-y-3">
              {countryData.map(d => (
                <li key={d.name} className="flex items-center gap-3">
                  <span className="text-sm text-ink-700 w-32 shrink-0 truncate">{d.name}</span>
                  <span className="flex-1 h-4 bg-ink-100 rounded-full overflow-hidden shadow-inset">
                    <motion.span
                      className="block h-full rounded-full"
                      style={{ background: d.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(d.value / applications.length) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                    />
                  </span>
                  <span className="text-sm font-medium text-ink-900 w-6 text-right tabular-nums shrink-0">
                    {d.value}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {monthly.some(m => m.count > 0) && (
        <Panel title="Applications submitted, last six months" delay={0.3}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} barSize={30}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ece9de" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#7a705e' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#7a705e' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <RTooltip content={<ChartTooltip />} cursor={{ fill: '#f6f5f0' }} />
              <Bar dataKey="count" name="Submitted" fill="#1a1914" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {areaData.length > 0 && (
          <Panel title="Research areas" delay={0.35}>
            <ul className="space-y-3">
              {areaData.map(d => (
                <li key={d.name} className="flex items-center gap-3">
                  <span className="text-sm text-ink-700 w-36 shrink-0 truncate">{d.name}</span>
                  <span className="flex-1 h-4 bg-ink-100 rounded-full overflow-hidden shadow-inset">
                    <motion.span
                      className="block h-full rounded-full"
                      style={{ background: d.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(d.value / applications.length) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                    />
                  </span>
                  <span className="text-sm font-medium text-ink-900 w-6 text-right tabular-nums shrink-0">
                    {d.value}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {spend.paid > 0 && (
          <Panel title="What this cycle has cost" delay={0.4}>
            <div className="font-display text-4xl text-ink-900 tabular-nums">
              {formatINR(spend.paid)}
            </div>
            <p className="text-sm text-ink-500 mt-2 leading-relaxed">
              across {applications.filter(a => feeInINR(a.fee) > 0 && !a.fee?.waiverGranted).length} applications
              {spend.waived > 0 && `, with ${spend.waived} fee${spend.waived === 1 ? '' : 's'} waived`}.
            </p>
            {sent.length > 0 && (
              <p className="text-xs text-ink-400 mt-3">
                {formatINR(Math.round(spend.paid / Math.max(sent.length, 1)))} per submitted application on average.
              </p>
            )}
          </Panel>
        )}
      </div>

      {docStats.length > 0 && (
        <Panel title="Document readiness" delay={0.45}>
          <p className="text-xs text-ink-400 mb-4 leading-relaxed max-w-prose">
            Measured against the applications that actually require each document,
            not against everything — a document only two universities ask for is not
            failing because the other ten do not need it.
          </p>
          <ul className="space-y-3">
            {docStats.map((doc, i) => (
              <li key={doc.id} className="flex items-center gap-3">
                <span className="text-sm text-ink-700 w-44 shrink-0 truncate">{doc.name}</span>
                <span className="flex-1 h-4 bg-ink-100 rounded-full overflow-hidden shadow-inset">
                  <motion.span
                    className="block h-full rounded-full"
                    style={{ background: doc.percentage === 100 ? '#448d65' : AREA_COLORS[i % AREA_COLORS.length] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(doc.percentage, 3)}%` }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  />
                </span>
                <span className="text-xs text-ink-500 w-20 text-right tabular-nums shrink-0">
                  {doc.submitted}/{doc.requiredBy}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}
