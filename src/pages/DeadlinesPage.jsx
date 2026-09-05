import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarClock, CheckCircle2, Download, ChevronDown } from 'lucide-react'
import { useData } from '../hooks/useData'
import { useToast } from '../hooks/useToast'
import { describeDeadline, isOverdue, URGENCY } from '../lib/datetime'
import { STAGES, isClosed } from '../lib/model'
import { buildICS, downloadICS } from '../lib/calendar'
import { RowSkeleton } from '../components/Skeleton'
import { Button, EmptyState, cn, toneOf } from '../components/ui'
import { StageBadge, DeadlineDisplay, UrgencyDot, toneForUrgency } from '../components/domain'

const KINDS = {
  opens:    { label: 'Opens',          weight: 1 },
  deadline: { label: 'Application',    weight: 0 },
  lor:      { label: 'Recommendations',weight: 0 },
  decision: { label: 'Decision',       weight: 2 },
}

function DeadlineRow({ entry, index, onOpen }) {
  const { record, kind, d, isLead } = entry
  const tone = toneForUrgency(d.urgency, kind)
  const t = toneOf(tone)

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.2), duration: 0.22 }}
    >
      <button
        onClick={() => onOpen(entry)}
        className={cn(
          'w-full text-left bg-white rounded-2xl border shadow-surface hover:shadow-raised',
          'p-4 flex items-center gap-4 transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400',
          d.overdue ? 'border-ink-200 opacity-70' : t.border,
        )}
      >
        <UrgencyDot value={record[kindField(kind)]} kind={kind === 'opens' ? 'opens' : 'deadline'} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-ink-900 text-sm truncate">{record.university}</span>
            {isLead && (
              <span className="text-2xs uppercase tracking-wider text-sky-600 shrink-0">lead</span>
            )}
          </div>
          <p className="text-xs text-ink-500 mt-0.5 truncate">
            {[record.professor, KINDS[kind].label].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="text-right shrink-0 hidden sm:block">
          <DeadlineDisplay value={record[kindField(kind)]} kind={kind === 'opens' ? 'opens' : 'deadline'} compact />
          <p className="text-xs text-ink-400 mt-0.5">{d.schoolDate}</p>
          {d.crossesDay && (
            <p className="text-2xs text-sky-600">{d.homeDate} your time</p>
          )}
        </div>

        <div className="sm:hidden text-right shrink-0">
          <DeadlineDisplay value={record[kindField(kind)]} kind={kind === 'opens' ? 'opens' : 'deadline'} compact />
        </div>

        {!isLead && <div className="hidden md:block shrink-0"><StageBadge stage={record.stage} short /></div>}
      </button>
    </motion.li>
  )
}

const kindField = (kind) => ({
  opens: 'startDate', deadline: 'deadline', lor: 'lorDeadline', decision: 'expectedDecision',
}[kind])

export default function DeadlinesPage() {
  const { loading, applications, leads } = useData()
  const navigate = useNavigate()
  const toast = useToast()
  const [showPast, setShowPast] = useState(false)

  const entries = useMemo(() => {
    const out = []
    const add = (record, kind, isLead) => {
      const value = record[kindField(kind)]
      if (!value) return
      const d = describeDeadline(value)
      if (d) out.push({ record, kind, d, isLead })
    }

    applications.filter(a => !isClosed(a.stage)).forEach(a => {
      add(a, 'opens', false); add(a, 'deadline', false)
      add(a, 'lor', false); add(a, 'decision', false)
    })
    leads.filter(l => (l.state || 'active') === 'active').forEach(l => {
      add(l, 'opens', true); add(l, 'deadline', true)
    })

    return out.sort((a, b) => a.d.instant - b.d.instant)
  }, [applications, leads])

  const upcoming = entries.filter(e => !e.d.overdue)
  const past = entries.filter(e => e.d.overdue)

  const byBand = (max) => upcoming.filter(e => e.d.days <= max).length

  const handleOpen = (entry) => {
    navigate(entry.isLead ? '/leads' : `/applications?open=${entry.record.id}`)
  }

  const handleExportCalendar = () => {
    if (entries.length === 0) return
    const ics = buildICS(entries)
    downloadICS(ics, 'phdbench-deadlines.ics')
    toast.success('Calendar file downloaded. Import it into Google Calendar to get reminders.')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-ink-100 rounded-lg animate-shimmer" />
        <div className="space-y-2">{Array.from({ length: 5 }, (_, i) => <RowSkeleton key={i} />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink-900">Deadlines</h1>
          <p className="text-ink-500 text-sm mt-1">
            {upcoming.length} ahead
            {past.length > 0 && ` · ${past.length} passed`}
          </p>
        </div>
        {entries.length > 0 && (
          <Button variant="secondary" icon={Download} onClick={handleExportCalendar}>
            Add to calendar
          </Button>
        )}
      </div>

      {/* Charter #2: bands give each number something to be measured against. */}
      {upcoming.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Within 7 days',  count: byBand(7),  tone: 'rose' },
            { label: 'Within 14 days', count: byBand(14), tone: 'amber' },
            { label: 'This month',     count: byBand(30), tone: 'sky' },
            { label: 'All upcoming',   count: upcoming.length, tone: 'ink' },
          ].map(s => (
            <div key={s.label} className={cn('rounded-2xl px-4 py-3', toneOf(s.tone).soft)}>
              <div className="font-display text-2xl tabular-nums leading-none">{s.count}</div>
              <div className="text-xs mt-1.5 opacity-80">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {upcoming.length === 0 ? (
        <EmptyState
          icon={entries.length === 0 ? CalendarClock : CheckCircle2}
          title={entries.length === 0 ? 'No dates recorded yet' : 'Nothing ahead of you'}
          description={
            entries.length === 0
              ? 'Add deadlines to your applications and leads — with the university\'s timezone — and they will all appear here in order.'
              : 'Every deadline you are tracking has passed. Time to find some more positions.'
          }
        />
      ) : (
        <ul className="space-y-2">
          {upcoming.map((entry, i) => (
            <DeadlineRow key={`${entry.record.id}-${entry.kind}`} entry={entry} index={i} onOpen={handleOpen} />
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast(p => !p)}
            className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-800
                       px-3 py-2 rounded-lg hover:bg-ink-100 transition-colors duration-120
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-300"
          >
            <ChevronDown size={13} className={cn('transition-transform duration-150', showPast && 'rotate-180')} aria-hidden="true" />
            {showPast ? 'Hide' : 'Show'} {past.length} that {past.length === 1 ? 'has' : 'have'} passed
          </button>

          {showPast && (
            <ul className="space-y-2 mt-3">
              {past.map((entry, i) => (
                <DeadlineRow key={`past-${entry.record.id}-${entry.kind}`} entry={entry} index={i} onOpen={handleOpen} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
