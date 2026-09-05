// src/components/domain.jsx
// Components that know about PhD applications specifically — stages, deadlines,
// document readiness, recommenders. Kept apart from ui.jsx so the primitives
// stay generic.

import {
  Circle, PenLine, PackageCheck, Send, Hourglass, Video, PartyPopper,
  ListOrdered, XCircle, Undo2, CalendarX,
  Star, Target, Shield, Globe2, HelpCircle, BadgeCheck, FileQuestion, Mails,
} from 'lucide-react'

// Explicit named imports only. A namespace import (`import * as Icons`) pulls
// the entire lucide-react library into the bundle because it cannot be
// tree-shaken — it cost 729 kB before this was corrected.
const STAGE_ICONS = {
  Circle, PenLine, PackageCheck, Send, Hourglass, Video, PartyPopper,
  ListOrdered, XCircle, Undo2, CalendarX,
}
import { Badge, Dot, Progress, Tooltip, toneOf, cn } from './ui'
import { STAGES, PRIORITIES, LOR_STATUSES, LEAD_STATES, CURRENCIES, countryByCode } from '../lib/model'
import { describeDeadline, countdownLabel, URGENCY, HOME_TIMEZONE } from '../lib/datetime'
import { docsProgress as computeDocsProgress } from '../lib/derive'

// ─── Stage ───────────────────────────────────────────────────────────────────

export function StageBadge({ stage, short = false, className }) {
  const meta = STAGES[stage]
  if (!meta) return <Badge tone="ink" className={className}>{stage || 'Unknown'}</Badge>

  const Icon = STAGE_ICONS[meta.icon] || Circle
  return (
    <Badge tone={meta.tone} icon={Icon} title={meta.help} className={className}>
      {short ? meta.short : meta.label}
    </Badge>
  )
}

export function LeadStateBadge({ state, className }) {
  const meta = LEAD_STATES[state]
  if (!meta) return null
  return <Badge tone={meta.tone} title={meta.help} className={className}>{meta.label}</Badge>
}

export function PriorityBadge({ priority, className }) {
  const meta = PRIORITIES[priority]
  if (!meta) return null
  const Icon = priority === 'dream' ? Star : priority === 'target' ? Target : Shield
  return (
    <Badge tone={meta.tone} icon={Icon} title={meta.help} className={className}>
      {meta.label}
    </Badge>
  )
}

/** Fit score as filled dots — faster to compare across cards than "4/5". */
export function FitScore({ score, className }) {
  if (!score) return null
  return (
    <Tooltip label={`Fit: ${score} out of 5`}>
      <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`Fit score ${score} of 5`}>
        {[1, 2, 3, 4, 5].map(n => (
          <span
            key={n}
            className={cn('w-1.5 h-1.5 rounded-full', n <= score ? 'bg-ink-700' : 'bg-ink-200')}
            aria-hidden="true"
          />
        ))}
      </span>
    </Tooltip>
  )
}

// ─── Deadlines ───────────────────────────────────────────────────────────────

const URGENCY_TONE = {
  [URGENCY.OVERDUE]:  'ink',
  [URGENCY.TODAY]:    'rose',
  [URGENCY.CRITICAL]: 'rose',
  [URGENCY.URGENT]:   'amber',
  [URGENCY.SOON]:     'amber',
  [URGENCY.UPCOMING]: 'sky',
  [URGENCY.FUTURE]:   'sage',
}

/**
 * `kind` matters because urgency is not the same thing as lateness.
 *
 * A deadline approaching is bad news and goes amber then rose. A date on which
 * applications *open* approaching is good news, and rendering it in the warning
 * colour tells the user something untrue. Charter #10: a colour means one thing.
 */
export const toneForUrgency = (urgency, kind = 'deadline') => {
  if (kind === 'opens') {
    return urgency === URGENCY.OVERDUE ? 'sage' : 'sky'
  }
  return URGENCY_TONE[urgency] || 'ink'
}

/**
 * A deadline, rendered honestly.
 *
 * When the university's calendar date differs from the applicant's — a US
 * 11:59 PM deadline is the next morning in India — both are shown. Displaying
 * only one of them is precisely how someone submits a day late while believing
 * they were a day early.
 */
export function DeadlineDisplay({ value, label, now, kind = 'deadline', compact = false, className }) {
  const d = describeDeadline(value, now ? { now } : {})
  if (!d) return null

  const tone = toneForUrgency(d.urgency, kind)
  const t = toneOf(tone)

  if (compact) {
    return (
      <Tooltip
        label={d.crossesDay
          ? `${d.schoolDate}, ${d.schoolTime} at the university — ${d.homeDate}, ${d.homeTime} your time`
          : `${d.schoolDate}, ${d.schoolTime}`}
      >
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium tabular-nums', t.text, className)}>
          {d.crossesDay && <Globe2 size={11} aria-hidden="true" />}
          {countdownLabel(value, now ? { now } : {})}
        </span>
      </Tooltip>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-baseline justify-between gap-3">
        {label && <span className="text-xs text-ink-400">{label}</span>}
        <span className={cn('text-xs font-medium tabular-nums', t.text)}>
          {countdownLabel(value, now ? { now } : {})}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-ink-500">
        <span>{d.schoolDate}, {d.schoolTime}</span>
        {d.timezone !== HOME_TIMEZONE && (
          <span className="text-ink-300">·</span>
        )}
        {d.timezone !== HOME_TIMEZONE && (
          <span className="text-ink-400">{shortZone(d.timezone)}</span>
        )}
      </div>

      {/* The line that prevents a missed deadline. */}
      {d.crossesDay && (
        <div className="flex items-center gap-1.5 text-xs">
          <Globe2 size={11} className="text-sky-500 shrink-0" aria-hidden="true" />
          <span className="text-sky-700">
            {d.homeDate}, {d.homeTime} for you
          </span>
        </div>
      )}

      {/* An unlabelled legacy date is a guess, and says so rather than
          presenting itself as fact. */}
      {d.assumedZone && (
        <Tooltip label="This date was saved without a timezone, so it is being read in your local time. Set the university's timezone to make the countdown exact.">
          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
            <HelpCircle size={11} aria-hidden="true" /> timezone not set
          </span>
        </Tooltip>
      )}
    </div>
  )
}

const shortZone = (tz) => (tz || '').split('/').pop()?.replace(/_/g, ' ') || ''

export function UrgencyDot({ value, now, kind = 'deadline', className }) {
  const d = describeDeadline(value, now ? { now } : {})
  if (!d) return null
  const tone = toneForUrgency(d.urgency, kind)
  const critical = kind !== 'opens' && (d.urgency === URGENCY.CRITICAL || d.urgency === URGENCY.TODAY)
  return <Dot tone={tone} pulse={critical} className={className} />
}

// ─── Country ─────────────────────────────────────────────────────────────────

/**
 * Country as a short code, with the full name in the tooltip.
 *
 * Deliberately no flag emoji. Windows has no flag glyphs, so Chromium falls
 * back to rendering the underlying regional-indicator letters — which made the
 * chip read "CH CH", "US US", "CA CA". A decoration that breaks on the user's
 * own operating system is not worth the row it sits in.
 */
export function CountryChip({ code, className }) {
  const country = countryByCode(code)
  if (!country) return null
  return (
    <Tooltip label={country.name}>
      <span className={cn(
        'inline-flex items-center text-2xs font-medium tracking-wide',
        'px-1.5 py-0.5 rounded-md bg-ink-100 text-ink-600',
        className,
      )}>
        {country.code === 'OTHER' ? 'Other' : country.code}
      </span>
    </Tooltip>
  )
}

// ─── Money ───────────────────────────────────────────────────────────────────

export const formatMoney = (amount, currency) => {
  if (amount === null || amount === undefined || amount === '') return null
  const meta = CURRENCIES[currency] || { symbol: '' }
  const n = Number(amount)
  if (Number.isNaN(n)) return null
  return `${meta.symbol}${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export const formatINR = (amount) => {
  const n = Number(amount)
  if (Number.isNaN(n)) return null
  // Indian digit grouping — 2,48,000 rather than 248,000.
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export const feeInINR = (fee) => {
  if (!fee || fee.amount === null || fee.amount === undefined || fee.amount === '') return 0
  const amount = Number(fee.amount)
  const rate = Number(fee.inrRate)
  if (Number.isNaN(amount)) return 0
  if (fee.currency === 'INR') return amount
  if (Number.isNaN(rate) || !rate) return 0
  return amount * rate
}

/**
 * Charter #2: a fee shown alone is a number without meaning. Shown against the
 * cycle total it becomes information — you can see whether this one matters.
 */
export function FeeDisplay({ fee, cycleTotalINR, className }) {
  if (!fee) return null
  const primary = formatMoney(fee.amount, fee.currency)
  if (primary === null) return null

  const inr = feeInINR(fee)
  const share = cycleTotalINR > 0 && inr > 0 ? Math.round((inr / cycleTotalINR) * 100) : null

  if (Number(fee.amount) === 0) {
    return <Badge tone="sage" icon={BadgeCheck} className={className}>No fee</Badge>
  }

  return (
    <span className={cn('inline-flex items-baseline gap-1.5 text-xs', className)}>
      <span className="text-ink-800 font-medium tabular-nums">{primary}</span>
      {inr > 0 && fee.currency !== 'INR' && (
        <span className="text-ink-400 tabular-nums">≈ {formatINR(inr)}</span>
      )}
      {share !== null && share > 0 && (
        <span className="text-ink-300">· {share}% of cycle</span>
      )}
      {fee.waiverGranted && <Badge tone="sage" className="ml-1">waived</Badge>}
      {fee.waiverRequested && !fee.waiverGranted && <Badge tone="amber" className="ml-1">waiver pending</Badge>}
      {fee.paid && !fee.waiverGranted && <Badge tone="sage" className="ml-1">paid</Badge>}
    </span>
  )
}

// ─── Documents ───────────────────────────────────────────────────────────────

// Derivation lives in lib/derive.js so it stays testable and free of React.
export { docsProgress } from '../lib/derive'

export function DocsProgress({ app, documents, className }) {
  const { done, total } = computeDocsProgress(app, documents)

  if (total === 0) {
    return (
      <Tooltip label="No documents marked as required for this application yet. Edit it to choose which ones it needs.">
        <span className={cn('inline-flex items-center gap-1.5 text-xs text-ink-400', className)}>
          <FileQuestion size={12} aria-hidden="true" /> no documents set
        </span>
      </Tooltip>
    )
  }

  return (
    <Progress
      value={done}
      max={total}
      tone="amber"
      label={`${done}/${total} docs`}
      className={className}
    />
  )
}

// ─── Recommenders ────────────────────────────────────────────────────────────

/**
 * A missing letter of recommendation does not announce itself — the portal
 * simply never completes. This surfaces the ones still outstanding.
 */
export function lorSummary(app) {
  const list = app.recommenders || []
  if (list.length === 0) return null
  const submitted = list.filter(r => !LOR_STATUSES[r.status]?.blocking).length
  const notAsked = list.filter(r => r.status === 'not_asked').length
  return { total: list.length, submitted, notAsked, blocking: list.length - submitted }
}

export function LorSummary({ app, className }) {
  const summary = lorSummary(app)
  if (!summary) return null

  const complete = summary.blocking === 0
  const tone = complete ? 'sage' : summary.notAsked > 0 ? 'rose' : 'amber'

  return (
    <Tooltip
      label={complete
        ? 'All recommendation letters submitted'
        : summary.notAsked > 0
          ? `${summary.notAsked} recommender${summary.notAsked > 1 ? 's have' : ' has'} not been asked yet`
          : `${summary.blocking} letter${summary.blocking > 1 ? 's' : ''} still outstanding`}
    >
      <span className={cn('inline-flex items-center gap-1.5 text-xs', toneOf(tone).text, className)}>
        <Mails size={12} aria-hidden="true" />
        <span className="tabular-nums">{summary.submitted}/{summary.total} LOR</span>
      </span>
    </Tooltip>
  )
}

export function LorStatusBadge({ status, className }) {
  const meta = LOR_STATUSES[status]
  if (!meta) return null
  return <Badge tone={meta.tone} className={className}>{meta.label}</Badge>
}
