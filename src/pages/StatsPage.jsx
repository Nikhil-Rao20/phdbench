// src/pages/StatsPage.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getApplications, getLeads, getDocuments } from '../lib/db'
import { motion } from 'framer-motion'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  RadialBarChart, RadialBar, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import { BarChart3 } from 'lucide-react'

const STATUS_COLORS = {
  applied:   '#e8ad2a',
  emailed:   '#448d65',
  interview: '#f43f5e',
  offer:     '#22c55e',
  rejected:  '#b8b19a',
}

const TYPE_COLORS = {
  portal: '#38bdf8',
  email:  '#a78bfa',
  both:   '#fb923c',
}

const AREA_COLORS = [
  '#448d65','#e8ad2a','#38bdf8','#f43f5e','#a78bfa','#fb923c','#22c55e','#94a3b8'
]

const RADIAL_COLORS = [
  '#448d65', '#38bdf8', '#e8ad2a', '#f43f5e', 
  '#a78bfa', '#fb923c', '#22c55e', '#14b8a6',
  '#ec4899', '#06b6d4', '#8b5cf6', '#f59e0b'
]

function StatCard({ label, value, sub, color = 'bg-ink-900', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="stat-card"
    >
      <div className="font-display text-4xl text-ink-900">{value}</div>
      <div className="text-ink-700 text-sm font-medium">{label}</div>
      {sub && <div className="text-ink-400 text-xs">{sub}</div>}
    </motion.div>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-4 pb-2 border-b border-ink-100">
      {children}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-lg p-3 text-sm">
      {label && <div className="text-ink-500 text-xs mb-1 capitalize">{label}</div>}
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-ink-700 capitalize">{p.name}:</span>
          <span className="font-medium text-ink-900">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function StatsPage() {
  const { user } = useAuth()
  const [apps,  setApps]  = useState([])
  const [leads, setLeads] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([getApplications(user.uid), getLeads(user.uid), getDocuments(user.uid)])
      .then(([a, l, d]) => { setApps(a); setLeads(l); setDocuments(d) })
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-7 h-7 border-2 border-ink-200 border-t-ink-800 rounded-full animate-spin" />
    </div>
  )

  if (apps.length === 0 && leads.length === 0) return (
    <div className="card p-16 text-center animate-fade-in">
      <BarChart3 size={36} className="mx-auto mb-3 text-ink-300" />
      <p className="text-ink-600 font-medium">No data yet</p>
      <p className="text-ink-400 text-sm mt-1">Add some leads and applications to see your stats.</p>
    </div>
  )

  // ── Compute datasets ──────────────────────────────────────
  const totalApps     = apps.length
  const totalLeads    = leads.length
  const responseRate  = totalApps > 0
    ? Math.round((apps.filter(a => ['interview','offer'].includes(a.status)).length / totalApps) * 100)
    : 0
  const emailReplyRate = apps.filter(a => a.applicationType !== 'portal').length > 0
    ? Math.round((apps.filter(a => a.emailReplied).length / apps.filter(a => a.applicationType !== 'portal').length) * 100)
    : 0

  // Document submission analysis
  const docStats = documents.map(doc => {
    const count = apps.filter(a => {
      const isRequired = (a.requiredDocs || []).includes(doc.id)
      const isSubmitted = a.submittedDocs?.[doc.id] || a.docs?.[doc.id]
      return isRequired && isSubmitted
    }).length
    return { id: doc.id, name: doc.name, count, percentage: totalApps > 0 ? Math.round((count / totalApps) * 100) : 0 }
  })

  const docStatsSorted = [...docStats].sort((a, b) => b.percentage - a.percentage)

  // Average docs based on what's required per app, not total
  const docsAvg = totalApps > 0 && documents.length > 0
    ? Math.round(apps.reduce((acc, a) => {
        const requiredCount = (a.requiredDocs || []).length
        const submittedCount = (a.requiredDocs || []).filter(docId =>
          a.submittedDocs?.[docId] || a.docs?.[docId]
        ).length
        return acc + submittedCount
      }, 0) / totalApps * 10) / 10
    : 0

  // Status distribution
  const statusData = Object.entries(STATUS_COLORS).map(([status, color]) => ({
    name: status,
    value: apps.filter(a => a.status === status).length,
    color,
  })).filter(d => d.value > 0)

  // App type distribution
  const typeData = Object.entries(TYPE_COLORS).map(([type, color]) => ({
    name: type,
    value: apps.filter(a => a.applicationType === type).length,
    color,
  })).filter(d => d.value > 0)

  // Research area distribution
  const areaCounts = {}
  apps.forEach(a => {
    const k = a.researchArea || 'Unspecified'
    areaCounts[k] = (areaCounts[k] || 0) + 1
  })
  const areaData = Object.entries(areaCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name, value, color: AREA_COLORS[i % AREA_COLORS.length] }))

  // Monthly pipeline (last 6 months)
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const d    = new Date()
    d.setMonth(d.getMonth() - i)
    const month = d.toLocaleString('default', { month: 'short' })
    const yr    = d.getFullYear()
    const mm    = d.getMonth()
    const count = apps.filter(a => {
      if (!a.createdAt?.seconds) return false
      const ad = new Date(a.createdAt.seconds * 1000)
      return ad.getMonth() === mm && ad.getFullYear() === yr
    }).length
    monthlyData.push({ month, count })
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="section-title">Stats</h1>
        <p className="text-ink-500 text-sm mt-0.5">Your PhD application analytics at a glance.</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total leads"     value={totalLeads}                    sub="saved"           delay={0} />
        <StatCard label="Applications"    value={totalApps}                     sub="submitted"       delay={0.07} />
        <StatCard label="Response rate"   value={`${responseRate}%`}            sub="interview/offer" delay={0.14} />
        <StatCard label="Email reply rate" value={`${emailReplyRate}%`}         sub="of cold emails"  delay={0.21} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Status breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="card p-5"
        >
          <SectionTitle>Application status breakdown</SectionTitle>
          {statusData.length === 0 ? (
            <p className="text-ink-400 text-sm text-center py-8">No data</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    paddingAngle={3} dataKey="value">
                    {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {statusData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-ink-600 capitalize flex-1">{d.name}</span>
                    <span className="font-medium text-ink-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* App type breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="card p-5"
        >
          <SectionTitle>Application type</SectionTitle>
          {typeData.length === 0 ? (
            <p className="text-ink-400 text-sm text-center py-8">No data</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    paddingAngle={3} dataKey="value">
                    {typeData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {typeData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-ink-600 capitalize flex-1">{d.name}</span>
                    <span className="font-medium text-ink-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Monthly applications */}
      {totalApps > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="card p-5"
        >
          <SectionTitle>Applications over time (last 6 months)</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ece9de" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#7a705e' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#7a705e' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Applications" fill="#1a1914" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Research areas */}
      {areaData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="card p-5"
        >
          <SectionTitle>Research areas applied to</SectionTitle>
          <div className="space-y-3">
            {areaData.map(d => (
              <div key={d.name} className="flex items-center gap-3">
                <div className="text-sm text-ink-700 w-40 shrink-0 truncate">{d.name}</div>
                <div className="flex-1 h-5 bg-ink-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${(d.value / totalApps) * 100}%` }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="h-full rounded-full"
                    style={{ background: d.color }}
                  />
                </div>
                <div className="text-sm font-medium text-ink-900 w-6 text-right shrink-0">{d.value}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Document submission analysis - Clean Radial Bar Chart */}
      {totalApps > 0 && documents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="card p-8"
        >
          <SectionTitle>Document submission breakdown</SectionTitle>

          <div className="grid grid-cols-1 lg:grid-cols-[220px,1fr] gap-8 items-center">
            {/* Left: Labels and values */}
            <div className="space-y-3 w-full">
              {docStatsSorted.map((doc, i) => (
                <div key={doc.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: RADIAL_COLORS[i % RADIAL_COLORS.length] }}
                    />
                    <span className="text-ink-700 font-medium truncate">{doc.name}</span>
                  </div>
                  <span className="text-ink-900 font-bold shrink-0">{doc.percentage}%</span>
                </div>
              ))}
            </div>

            {/* Right: Radial Chart */}
            <div className="w-full">
              <ResponsiveContainer width="100%" height={360}>
                <RadialBarChart
                  data={docStatsSorted}
                  cx="50%"
                  cy="50%"
                  innerRadius="20%"
                  outerRadius="92%"
                  startAngle={90}
                  endAngle={-270}
                  barSize={14}
                  margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <PolarAngleAxis
                    type="number"
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <PolarRadiusAxis
                    type="category"
                    dataKey="name"
                    tick={false}
                    axisLine={false}
                  />

                  <RadialBar
                    dataKey="percentage"
                    cornerRadius={999}
                    clockWise
                    background={{ fill: '#ece9de' }}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {docStatsSorted.map((d, i) => (
                      <Cell key={d.id} fill={RADIAL_COLORS[i % RADIAL_COLORS.length]} />
                    ))}
                  </RadialBar>

                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const item = payload[0].payload
                      return (
                        <div className="bg-ink-900 text-white rounded-xl shadow-xl p-3 text-sm border border-ink-700">
                          <div className="font-bold">{item.name}</div>
                          <div className="mt-1 text-ink-200">
                            {item.count} of {totalApps} submitted
                          </div>
                          <div className="text-sage-300 font-bold mt-1">
                            {item.percentage}%
                          </div>
                        </div>
                      )
                    }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-ink-100 text-center">
            <div className="font-display text-3xl text-ink-900">{docsAvg}</div>
            <div className="text-ink-400 text-sm mt-1">
              documents submitted on average per application
            </div>
          </div>
        </motion.div>
      )}



      {totalApps > 0 && documents.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="card p-5 text-center"
        >
          <SectionTitle className="text-center">Document analysis</SectionTitle>
          <p className="text-ink-400 text-sm">
            No documents configured yet.{' '}
            <a href="/settings" className="text-sage-600 hover:underline">
              Set up your documents in Settings
            </a>
          </p>
        </motion.div>
      )}
    </div>
  )
}
