import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getApplications } from '../lib/db'
import { getLeads } from '../lib/db'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Lightbulb, FileText, CalendarClock, TrendingUp,
  ArrowRight, Clock, AlertCircle
} from 'lucide-react'
import { formatDistanceToNow, isPast, differenceInDays } from 'date-fns'
import StatusBadge from '../components/StatusBadge'

const STATUS_COLORS = {
  lead: 'bg-sky-500',
  converted: 'bg-sage-500',
  applied: 'bg-amber-500',
  emailed: 'bg-sage-400',
  interview: 'bg-rose-500',
  offer: 'bg-green-500',
  rejected: 'bg-ink-400',
}

function StatCard({ label, value, icon: Icon, color, to, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Link to={to} className="stat-card hover:shadow-md transition-shadow group block">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
            <Icon size={17} className="text-white" />
          </div>
          <ArrowRight size={15} className="text-ink-300 group-hover:text-ink-600 transition-colors" />
        </div>
        <div className="font-display text-3xl text-ink-900">{value}</div>
        <div className="text-ink-500 text-xs mt-1">{label}</div>
      </Link>
    </motion.div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [apps, setApps]   = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([getApplications(user.uid), getLeads(user.uid)])
      .then(([a, l]) => { setApps(a); setLeads(l) })
      .finally(() => setLoading(false))
  }, [user])

  // Upcoming deadlines (within 30 days, not past)
  const upcoming = apps
    .filter(a => a.deadline)
    .map(a => ({ ...a, deadlineDate: new Date(a.deadline) }))
    .filter(a => !isPast(a.deadlineDate))
    .sort((a, b) => a.deadlineDate - b.deadlineDate)
    .slice(0, 5)

  // Recent applications
  const recent = [...apps]
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
    .slice(0, 6)

  const urgentCount = upcoming.filter(a => differenceInDays(a.deadlineDate, new Date()) <= 14).length

  const stats = [
    { label: 'Saved leads',    value: leads.length,                                   icon: Lightbulb,     color: 'bg-sky-500',   to: '/leads' },
    { label: 'Applications',   value: apps.length,                                    icon: FileText,       color: 'bg-amber-500', to: '/applications' },
    { label: 'Interviews',     value: apps.filter(a => a.status === 'interview').length, icon: TrendingUp,  color: 'bg-rose-500',  to: '/applications' },
    { label: 'Urgent deadlines', value: urgentCount,                                  icon: AlertCircle,   color: 'bg-rose-600',  to: '/deadlines' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-ink-300 border-t-ink-800 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <p className="text-ink-400 text-sm mb-1">Good to have you back,</p>
        <h1 className="font-display text-3xl text-ink-900">
          {user?.displayName?.split(' ')[0]} 👋
        </h1>
        <p className="text-ink-500 text-sm mt-1">
          {apps.length === 0
            ? 'Start by saving a lead or adding your first application.'
            : `You have ${apps.length} application${apps.length !== 1 ? 's' : ''} in the pipeline.`}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => <StatCard key={s.label} {...s} delay={i * 0.07} />)}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Upcoming deadlines */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="lg:col-span-2 card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-ink-900">Upcoming deadlines</h2>
            <Link to="/deadlines" className="text-xs text-sage-600 hover:underline">View all</Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="text-center py-8 text-ink-400 text-sm">
              <CalendarClock size={28} className="mx-auto mb-2 text-ink-300" />
              No upcoming deadlines
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(app => {
                const days = differenceInDays(app.deadlineDate, new Date())
                const urgent = days <= 14
                return (
                  <div key={app.id} className="flex items-start gap-3 p-3 rounded-xl bg-ink-50 hover:bg-ink-100 transition-colors">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${urgent ? 'bg-rose-500 animate-pulse-soft' : 'bg-amber-400'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink-800 truncate">{app.university}</div>
                      <div className="text-xs text-ink-500 truncate">{app.labName || app.professor}</div>
                    </div>
                    <div className={`text-xs font-medium shrink-0 ${urgent ? 'text-rose-600' : 'text-amber-600'}`}>
                      {days === 0 ? 'Today!' : `${days}d`}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Recent applications */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="lg:col-span-3 card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-ink-900">Recent applications</h2>
            <Link to="/applications" className="text-xs text-sage-600 hover:underline">View all</Link>
          </div>

          {recent.length === 0 ? (
            <div className="text-center py-8 text-ink-400 text-sm">
              <FileText size={28} className="mx-auto mb-2 text-ink-300" />
              No applications yet.{' '}
              <Link to="/applications" className="text-sage-600 hover:underline">Add one</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map(app => (
                <div
                  key={app.id}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-ink-50 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[app.status] || 'bg-ink-300'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-ink-800 truncate">{app.university}</div>
                    <div className="text-xs text-ink-400 truncate">{app.labName}</div>
                  </div>
                  <StatusBadge status={app.status} />
                  <div className="text-xs text-ink-400 shrink-0 hidden sm:block">
                    {app.createdAt?.seconds
                      ? formatDistanceToNow(new Date(app.createdAt.seconds * 1000), { addSuffix: true })
                      : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Pipeline visual */}
      {apps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="card p-5"
        >
          <h2 className="font-display text-lg text-ink-900 mb-4">Pipeline overview</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {['applied','emailed','interview','offer','rejected'].map(status => {
              const count = apps.filter(a => a.status === status).length
              const pct = apps.length > 0 ? Math.round((count / apps.length) * 100) : 0
              return (
                <div key={status} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`rounded-lg ${STATUS_COLORS[status]} transition-all`}
                    style={{ width: 56, height: Math.max(8, pct * 1.4) }}
                  />
                  <div className="text-xs text-ink-500 capitalize">{status}</div>
                  <div className="text-sm font-medium text-ink-800">{count}</div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}
