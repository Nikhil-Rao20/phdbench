// src/pages/DeadlinesPage.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getApplications } from '../lib/db'
import { motion } from 'framer-motion'
import { CalendarClock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { differenceInDays, isPast, format } from 'date-fns'
import StatusBadge from '../components/StatusBadge'

function urgencyLevel(days) {
  if (days < 0)  return { label: 'Overdue',  color: 'bg-ink-200 text-ink-500', dot: 'bg-ink-400', bar: 'bg-ink-300' }
  if (days <= 7)  return { label: '🔴 Critical', color: 'bg-rose-50 border-rose-200', dot: 'bg-rose-500 animate-pulse', bar: 'bg-rose-500' }
  if (days <= 14) return { label: '🟠 Urgent',   color: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500', bar: 'bg-amber-400' }
  if (days <= 30) return { label: '🟡 Upcoming', color: 'bg-sky-50 border-sky-200',     dot: 'bg-sky-400',   bar: 'bg-sky-400' }
  return { label: '🟢 Future',   color: 'bg-sage-50 border-sage-200', dot: 'bg-sage-400', bar: 'bg-sage-400' }
}

function DeadlineRow({ app, deadlineType, date, index }) {
  const d    = new Date(date)
  const days = differenceInDays(d, new Date())
  const urg  = urgencyLevel(days)
  const past = isPast(d)

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`card p-4 border flex items-center gap-4 ${urg.color} ${past ? 'opacity-50' : ''}`}
    >
      <div className={`w-3 h-3 rounded-full shrink-0 ${urg.dot}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-ink-900 text-sm">{app.university}</span>
          {app.labName && <span className="text-ink-400 text-xs">· {app.labName}</span>}
        </div>
        <div className="text-xs text-ink-500 mt-0.5">
          {app.professor} · <span className="capitalize">{deadlineType}</span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className={`text-sm font-medium ${
          days < 0 ? 'text-ink-400 line-through' :
          days <= 7 ? 'text-rose-700' :
          days <= 14 ? 'text-amber-700' : 'text-ink-700'
        }`}>
          {past ? 'Passed' : days === 0 ? 'TODAY' : `${days} days`}
        </div>
        <div className="text-xs text-ink-400">{format(d, 'MMM d, yyyy')}</div>
      </div>

      <StatusBadge status={app.status} />
    </motion.div>
  )
}

export default function DeadlinesPage() {
  const { user }   = useAuth()
  const [apps, setApps]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showPast, setShowPast] = useState(false)

  useEffect(() => {
    if (!user) return
    getApplications(user.uid).then(setApps).finally(() => setLoading(false))
  }, [user])

  // Collect all deadline entries
  const entries = []
  apps.forEach(app => {
    if (app.deadline)        entries.push({ app, deadlineType: 'Application deadline', date: app.deadline })
    if (app.lorDeadline)     entries.push({ app, deadlineType: 'LOR request',          date: app.lorDeadline })
    if (app.expectedDecision) entries.push({ app, deadlineType: 'Decision expected',   date: app.expectedDecision })
  })

  const sorted = entries.sort((a, b) => new Date(a.date) - new Date(b.date))
  const upcoming = sorted.filter(e => !isPast(new Date(e.date)))
  const past     = sorted.filter(e =>  isPast(new Date(e.date)))

  const urgentCount = upcoming.filter(e => differenceInDays(new Date(e.date), new Date()) <= 14).length
  const thisMonth   = upcoming.filter(e => differenceInDays(new Date(e.date), new Date()) <= 30).length

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-7 h-7 border-2 border-ink-200 border-t-ink-800 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="section-title">Deadlines</h1>
        <p className="text-ink-500 text-sm mt-0.5">
          {upcoming.length} upcoming · {urgentCount} urgent (≤14 days)
        </p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Critical (≤7d)',  count: upcoming.filter(e => differenceInDays(new Date(e.date), new Date()) <= 7).length,  color: 'bg-rose-100 text-rose-700' },
          { label: 'Urgent (≤14d)',   count: upcoming.filter(e => differenceInDays(new Date(e.date), new Date()) <= 14).length, color: 'bg-amber-100 text-amber-700' },
          { label: 'This month',      count: thisMonth,                                                                          color: 'bg-sky-100 text-sky-700' },
          { label: 'Total upcoming',  count: upcoming.length,                                                                    color: 'bg-ink-100 text-ink-600' },
        ].map(s => (
          <div key={s.label} className={`px-4 py-2 rounded-xl text-sm font-medium ${s.color}`}>
            <span className="font-bold">{s.count}</span> {s.label}
          </div>
        ))}
      </div>

      {/* Upcoming */}
      {upcoming.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-sage-400" />
          <p className="text-ink-600 font-medium">You're all clear!</p>
          <p className="text-ink-400 text-sm mt-1">No upcoming deadlines. Great job staying on top of things.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs font-medium text-ink-500 uppercase tracking-wider mb-2">Upcoming</div>
          {upcoming.map((e, i) => (
            <DeadlineRow key={`${e.app.id}-${e.deadlineType}`} {...e} index={i} />
          ))}
        </div>
      )}

      {/* Past deadlines toggle */}
      {past.length > 0 && (
        <div>
          <button
            className="btn-ghost text-xs"
            onClick={() => setShowPast(p => !p)}
          >
            {showPast ? '▲ Hide' : '▼ Show'} {past.length} past deadline{past.length !== 1 ? 's' : ''}
          </button>
          {showPast && (
            <div className="space-y-2 mt-3">
              {past.map((e, i) => (
                <DeadlineRow key={`past-${e.app.id}-${e.deadlineType}`} {...e} index={i} />
              ))}
            </div>
          )}
        </div>
      )}

      {entries.length === 0 && (
        <div className="card p-12 text-center">
          <CalendarClock size={32} className="mx-auto mb-3 text-ink-300" />
          <p className="text-ink-400 text-sm">No deadlines yet. Add them in your applications.</p>
        </div>
      )}
    </div>
  )
}
