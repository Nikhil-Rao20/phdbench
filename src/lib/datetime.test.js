import { describe, it, expect } from 'vitest'
import {
  normalizeDeadline,
  resolveInstant,
  daysUntil,
  isOverdue,
  urgencyOf,
  describeDeadline,
  countdownLabel,
  URGENCY,
  HOME_TIMEZONE,
} from './datetime'

// A fixed "now" so these tests never depend on when they run.
// 2026-01-15, 09:00 in India (IST = UTC+5:30) -> 03:30 UTC.
const IST_MORNING_OF_THE_15TH = new Date('2026-01-15T03:30:00Z')

describe('the original bug: deadlines vanishing on their due day', () => {
  // This is the exact failure that made deadlines disappear. Before the fix,
  // `new Date('2026-01-15')` produced 2026-01-15T00:00Z = 05:30 IST, so by
  // 09:00 IST on the due day `isPast()` was true and the deadline was filed
  // away as history while the user still had the whole day to submit.
  it('does not treat a deadline due today as already passed', () => {
    const options = { now: IST_MORNING_OF_THE_15TH }

    // The old, broken comparison, kept here to document what we fixed.
    expect(new Date('2026-01-15') < IST_MORNING_OF_THE_15TH).toBe(true)

    // The corrected behaviour.
    expect(isOverdue('2026-01-15', options)).toBe(false)
    expect(daysUntil('2026-01-15', options)).toBe(0)
    expect(urgencyOf('2026-01-15', options)).toBe(URGENCY.TODAY)
  })

  it('does not announce "today" a day early on the evening before', () => {
    // 2026-01-14, 20:00 IST. The old code returned 0 days here and shouted
    // "Deadline Today!" while there was still a full day to go.
    const eveningBefore = new Date('2026-01-14T14:30:00Z')
    expect(daysUntil('2026-01-15', { now: eveningBefore })).toBe(1)
    expect(countdownLabel('2026-01-15', { now: eveningBefore })).toBe('Due tomorrow')
  })

  it('counts calendar days the way a person counts them', () => {
    // A deadline at 09:00 tomorrow is "tomorrow", not "0 days" because it
    // happens to be 14 hours away.
    const options = { now: IST_MORNING_OF_THE_15TH }
    const tomorrowMorning = { date: '2026-01-16', time: '09:00', tz: HOME_TIMEZONE }
    expect(daysUntil(tomorrowMorning, options)).toBe(1)
  })
})

describe('international deadlines crossing the date line', () => {
  // The case that actually loses people admissions: a US deadline whose IST
  // equivalent falls on the following calendar day.
  const usDeadline = { date: '2026-12-15', time: '23:59', tz: 'America/New_York' }

  it('resolves a US wall-clock deadline to the correct instant', () => {
    // Dec 15 23:59 EST (UTC-5) = Dec 16 04:59 UTC.
    expect(resolveInstant(usDeadline).toISOString()).toBe('2026-12-16T04:59:00.000Z')
  })

  it('reports both the school date and the applicant date, and flags the gap', () => {
    const d = describeDeadline(usDeadline, { now: new Date('2026-12-01T00:00:00Z') })
    expect(d.schoolDate).toBe('Dec 15, 2026')
    expect(d.homeDate).toBe('Dec 16, 2026')
    expect(d.homeTime).toBe('10:29 AM')
    // The UI must be able to say "it is the 16th for you" — showing only one
    // date is how someone submits a day late believing they were early.
    expect(d.crossesDay).toBe(true)
  })

  it('handles a deadline that is still open in the US but "tomorrow" in India', () => {
    // Dec 16, 08:00 IST = Dec 15, 21:30 EST. The US portal is still open.
    const now = new Date('2026-12-16T02:30:00Z')
    expect(isOverdue(usDeadline, { now })).toBe(false)
    expect(countdownLabel(usDeadline, { now })).toMatch(/Due today/)
  })

  it('closes the deadline once the university clock passes it', () => {
    // Dec 16, 10:30 IST = Dec 16, 00:00 EST. One minute past the cut-off.
    const now = new Date('2026-12-16T05:00:00Z')
    expect(isOverdue(usDeadline, { now })).toBe(true)
    expect(urgencyOf(usDeadline, { now })).toBe(URGENCY.OVERDUE)
  })
})

describe('daylight saving time', () => {
  it('respects DST when resolving a summer deadline', () => {
    // Jul 15 23:59 EDT (UTC-4) = Jul 16 03:59 UTC — an hour earlier in UTC
    // than the winter equivalent. A fixed-offset implementation gets this wrong.
    const summer = { date: '2026-07-15', time: '23:59', tz: 'America/New_York' }
    expect(resolveInstant(summer).toISOString()).toBe('2026-07-16T03:59:00.000Z')
  })

  it('handles a UK deadline across BST', () => {
    const bst = { date: '2026-06-30', time: '17:00', tz: 'Europe/London' }
    expect(resolveInstant(bst).toISOString()).toBe('2026-06-30T16:00:00.000Z')
  })

  it('handles Australia, which is ahead of India', () => {
    const aus = { date: '2026-10-31', time: '23:59', tz: 'Australia/Sydney' }
    const d = describeDeadline(aus, { now: new Date('2026-10-01T00:00:00Z') })
    // Sydney is UTC+11 in October (AEDT); India is UTC+5:30. The deadline
    // lands on the *earlier* calendar date in India.
    expect(d.schoolDate).toBe('Oct 31, 2026')
    expect(d.homeDate).toBe('Oct 31, 2026')
    expect(d.homeTime).toBe('6:29 PM')
  })
})

describe('legacy data', () => {
  it('reads a bare legacy date string without losing it', () => {
    const n = normalizeDeadline('2026-03-01')
    expect(n).toMatchObject({ date: '2026-03-01', time: '23:59', tz: HOME_TIMEZONE })
  })

  it('marks an unlabelled legacy date as an assumed zone', () => {
    // The UI uses this to offer "which timezone is this?" rather than
    // pretending it knows.
    expect(normalizeDeadline('2026-03-01').assumedZone).toBe(true)
    expect(normalizeDeadline({ date: '2026-03-01', tz: 'Europe/Berlin' }).assumedZone).toBe(false)
  })

  it('errs toward the earlier instant for unlabelled dates', () => {
    // An unlabelled date resolved in IST is always earlier than the same
    // wall-clock date at a Western university, so the countdown is
    // conservative rather than dangerously generous.
    const assumed = resolveInstant('2026-03-01')
    const actualUS = resolveInstant({ date: '2026-03-01', time: '23:59', tz: 'America/New_York' })
    expect(assumed.getTime()).toBeLessThan(actualUS.getTime())
  })
})

describe('malformed input', () => {
  it.each([
    [null], [undefined], [''], ['not a date'], ['15-01-2026'], [{}], [{ date: 'nope' }], [42],
  ])('returns null rather than an Invalid Date for %p', (input) => {
    expect(normalizeDeadline(input)).toBeNull()
    expect(resolveInstant(input)).toBeNull()
    expect(daysUntil(input)).toBeNull()
    expect(describeDeadline(input)).toBeNull()
  })

  it('never renders NaN', () => {
    expect(countdownLabel(null)).toBe('')
    expect(countdownLabel('garbage')).toBe('')
  })

  it('falls back to end-of-day for a malformed time', () => {
    expect(normalizeDeadline({ date: '2026-03-01', time: '9am' }).time).toBe('23:59')
  })

  it('is not fooled by an unparseable timezone', () => {
    expect(resolveInstant({ date: '2026-03-01', tz: 'Mars/Olympus' })).toBeNull()
  })
})

describe('urgency bands', () => {
  const now = IST_MORNING_OF_THE_15TH
  const on = (date) => urgencyOf({ date, time: '23:59', tz: HOME_TIMEZONE }, { now })

  it('assigns each band at its boundary', () => {
    expect(on('2026-01-15')).toBe(URGENCY.TODAY)
    expect(on('2026-01-18')).toBe(URGENCY.CRITICAL)  // 3 days
    expect(on('2026-01-22')).toBe(URGENCY.URGENT)    // 7 days
    expect(on('2026-01-29')).toBe(URGENCY.SOON)      // 14 days
    expect(on('2026-02-14')).toBe(URGENCY.UPCOMING)  // 30 days
    expect(on('2026-03-20')).toBe(URGENCY.FUTURE)
  })

  it('reports a passed deadline as overdue, not as a negative countdown', () => {
    expect(on('2026-01-10')).toBe(URGENCY.OVERDUE)
    expect(countdownLabel('2026-01-10', { now })).toBe('Passed')
  })
})

describe('countdown copy inside the final day', () => {
  it('switches to hours so "0 days" never reads as "no time left"', () => {
    // 2026-01-15, 09:00 IST against a 23:59 IST deadline: ~14 hours remain.
    const label = countdownLabel(
      { date: '2026-01-15', time: '23:59', tz: HOME_TIMEZONE },
      { now: IST_MORNING_OF_THE_15TH },
    )
    expect(label).toBe('Due today · 14h left')
  })

  it('warns when under an hour remains', () => {
    const now = new Date('2026-01-15T18:10:00Z') // 23:40 IST
    const label = countdownLabel(
      { date: '2026-01-15', time: '23:59', tz: HOME_TIMEZONE },
      { now },
    )
    expect(label).toBe('Due within the hour')
  })
})
