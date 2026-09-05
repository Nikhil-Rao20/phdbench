// src/lib/datetime.js
// ─────────────────────────────────────────────────────────────────────────────
// Timezone-correct deadline handling.
//
// The bug this replaces: dates were stored as bare "YYYY-MM-DD" strings and read
// with `new Date(str)`, which JavaScript parses as UTC midnight. For a user in
// IST (UTC+5:30) that instant is 05:30 the same morning — so from 5:30 AM on the
// day a thing was due, `isPast()` returned true and the deadline silently
// dropped off the dashboard into the collapsed "past" section. The mirror error:
// after 18:30 the previous evening, `differenceInDays` returned 0 and the UI
// announced "Deadline Today!" a full day early.
//
// The model here: a deadline is a calendar date, a wall-clock time, and the
// timezone that clock belongs to. Those three resolve to one true instant.
// Everything downstream compares instants, and renders in whichever zone the
// reader needs — the university's, or the applicant's.
// ─────────────────────────────────────────────────────────────────────────────

import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz'
import { differenceInCalendarDays, differenceInHours, isValid } from 'date-fns'

/** Where the applicant lives. Deadlines are counted in *their* calendar days. */
export const HOME_TIMEZONE = 'Asia/Kolkata'

/** Universities write deadlines as "end of day" far more often than any other time. */
export const DEFAULT_DEADLINE_TIME = '23:59'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

/**
 * Normalise the several shapes a deadline can arrive in — a legacy bare string,
 * a partial object, or a complete one — into a single canonical form.
 *
 * Legacy bare strings are interpreted in the *home* timezone deliberately. A
 * date typed without a zone is ambiguous, and resolving it to IST places the
 * instant earlier than a Western university's real cut-off in every case. If we
 * must be wrong about an unlabelled legacy date, being wrong in the direction of
 * "submit sooner" is the only acceptable direction.
 */
export function normalizeDeadline(value, { homeTimezone = HOME_TIMEZONE } = {}) {
  if (!value) return null

  if (typeof value === 'string') {
    if (!DATE_RE.test(value)) return null
    return { date: value, time: DEFAULT_DEADLINE_TIME, tz: homeTimezone, assumedZone: true }
  }

  if (typeof value === 'object' && value.date) {
    if (!DATE_RE.test(value.date)) return null
    const time = TIME_RE.test(value.time || '') ? value.time : DEFAULT_DEADLINE_TIME
    return {
      date: value.date,
      time,
      tz: value.tz || homeTimezone,
      assumedZone: !value.tz,
    }
  }

  return null
}

/**
 * Resolve a deadline to the exact instant it falls due.
 * Returns null rather than an Invalid Date, so callers must handle absence
 * explicitly instead of silently rendering "NaN days".
 */
export function resolveInstant(value, options = {}) {
  const dl = normalizeDeadline(value, options)
  if (!dl) return null
  try {
    const instant = fromZonedTime(`${dl.date}T${dl.time}:00`, dl.tz)
    return isValid(instant) ? instant : null
  } catch {
    return null
  }
}

/**
 * Whole days remaining, counted as *calendar* days in the reader's timezone —
 * which is how a person actually counts. A deadline at 09:00 tomorrow is "1 day
 * away", not "0" because it happens to be 14 hours out.
 */
export function daysUntil(value, { now = new Date(), homeTimezone = HOME_TIMEZONE, ...rest } = {}) {
  const instant = resolveInstant(value, { homeTimezone, ...rest })
  if (!instant) return null
  return differenceInCalendarDays(
    toZonedTime(instant, homeTimezone),
    toZonedTime(now, homeTimezone),
  )
}

/** Hours remaining — used when a deadline is inside the final day. */
export function hoursUntil(value, { now = new Date(), ...options } = {}) {
  const instant = resolveInstant(value, options)
  if (!instant) return null
  return differenceInHours(instant, now)
}

/**
 * Has the moment genuinely passed? Compares instants, never calendar dates —
 * this is the check that used to fire ~18 hours early.
 */
export function isOverdue(value, { now = new Date(), ...options } = {}) {
  const instant = resolveInstant(value, options)
  if (!instant) return false
  return instant.getTime() < now.getTime()
}

export const URGENCY = {
  OVERDUE:  'overdue',
  TODAY:    'today',
  CRITICAL: 'critical',
  URGENT:   'urgent',
  SOON:     'soon',
  UPCOMING: 'upcoming',
  FUTURE:   'future',
}

/**
 * Urgency band. Colour and copy are derived from this in one place, so a
 * deadline never reads "critical" in one view and "upcoming" in another.
 */
export function urgencyOf(value, options = {}) {
  const instant = resolveInstant(value, options)
  if (!instant) return null
  if (isOverdue(value, options)) return URGENCY.OVERDUE
  const days = daysUntil(value, options)
  if (days === null) return null
  if (days <= 0) return URGENCY.TODAY
  if (days <= 3) return URGENCY.CRITICAL
  if (days <= 7) return URGENCY.URGENT
  if (days <= 14) return URGENCY.SOON
  if (days <= 30) return URGENCY.UPCOMING
  return URGENCY.FUTURE
}

/** Format an instant in a named zone. Returns '' for absent values, never 'Invalid Date'. */
export function formatIn(value, timezone, pattern = 'MMM d, yyyy', options = {}) {
  const instant = resolveInstant(value, options)
  if (!instant) return ''
  try {
    return formatInTimeZone(instant, timezone, pattern)
  } catch {
    return ''
  }
}

/**
 * Everything a deadline UI needs, computed once.
 *
 * `crossesDay` is the reason this exists: a US deadline of Dec 15, 23:59 EST is
 * Dec 16, 10:29 in India. When the school's date and the applicant's date differ,
 * the UI must say so — showing only one of them is how people submit a day late
 * while believing they were a day early.
 */
export function describeDeadline(value, {
  now = new Date(),
  homeTimezone = HOME_TIMEZONE,
  ...rest
} = {}) {
  const options = { now, homeTimezone, ...rest }
  const normalized = normalizeDeadline(value, options)
  const instant = resolveInstant(value, options)
  if (!normalized || !instant) return null

  const schoolDate = formatInTimeZone(instant, normalized.tz, 'MMM d, yyyy')
  const homeDate   = formatInTimeZone(instant, homeTimezone, 'MMM d, yyyy')

  return {
    instant,
    timezone: normalized.tz,
    assumedZone: normalized.assumedZone,
    days: daysUntil(value, options),
    hours: hoursUntil(value, options),
    overdue: isOverdue(value, options),
    urgency: urgencyOf(value, options),
    schoolDate,
    schoolTime: formatInTimeZone(instant, normalized.tz, 'h:mm a'),
    homeDate,
    homeTime: formatInTimeZone(instant, homeTimezone, 'h:mm a'),
    // True when the applicant's calendar date differs from the university's.
    crossesDay: schoolDate !== homeDate,
  }
}

/**
 * Human countdown. Deliberately switches to hours inside the last day, because
 * "0 days" reads as "no time at all" when there may be nine hours left.
 */
export function countdownLabel(value, options = {}) {
  const d = describeDeadline(value, options)
  if (!d) return ''
  if (d.overdue) return 'Passed'
  if (d.days === 0) {
    const h = Math.max(0, d.hours ?? 0)
    if (h <= 1) return 'Due within the hour'
    return `Due today · ${h}h left`
  }
  if (d.days === 1) return 'Due tomorrow'
  return `${d.days} days`
}

/** Today's date in the applicant's timezone, as YYYY-MM-DD — for date input defaults. */
export function todayInZone(timezone = HOME_TIMEZONE, now = new Date()) {
  return formatInTimeZone(now, timezone, 'yyyy-MM-dd')
}
