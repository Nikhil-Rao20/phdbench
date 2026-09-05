// src/lib/calendar.js
// ─────────────────────────────────────────────────────────────────────────────
// Export deadlines as an .ics file.
//
// This is the reminder mechanism that needs no backend, no Blaze plan and no
// push permissions: hand the dates to Google Calendar and let it do the
// notifying, on every device the user already carries.
//
// Events are written in UTC (the `Z` suffix), which sidesteps VTIMEZONE
// definitions entirely — the instant is unambiguous, and every calendar client
// renders it in the viewer's own zone.
// ─────────────────────────────────────────────────────────────────────────────

import { resolveInstant } from './datetime'

const KIND_LABEL = {
  opens: 'opens',
  deadline: 'deadline',
  lor: 'recommendation letters due',
  decision: 'decision expected',
}

const KIND_FIELD = {
  opens: 'startDate', deadline: 'deadline', lor: 'lorDeadline', decision: 'expectedDecision',
}

const pad = (n) => String(n).padStart(2, '0')

function toICSDate(date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
         `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}

/**
 * Escape per RFC 5545. Unescaped commas and semicolons silently corrupt the
 * field structure, and a university name containing one is not unusual.
 */
function escapeText(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** RFC 5545 caps a content line at 75 octets; longer lines must be folded. */
function fold(line) {
  if (line.length <= 74) return line
  const parts = []
  let remaining = line
  parts.push(remaining.slice(0, 74))
  remaining = remaining.slice(74)
  while (remaining.length > 0) {
    parts.push(' ' + remaining.slice(0, 73))
    remaining = remaining.slice(73)
  }
  return parts.join('\r\n')
}

export function buildICS(entries, { alarmDaysBefore = [7, 1] } = {}) {
  const now = toICSDate(new Date())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PhDBench//Application Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:PhD application deadlines',
  ]

  for (const entry of entries) {
    const { record, kind } = entry
    const value = record[KIND_FIELD[kind]]
    const instant = resolveInstant(value)
    if (!instant) continue

    const summary = `${record.university} — ${KIND_LABEL[kind] || kind}`
    const description = [
      record.labName && `Lab: ${record.labName}`,
      record.professor && `Professor: ${record.professor}`,
      record.appUrl && `Portal: ${record.appUrl}`,
      record.applicationId && `Reference: ${record.applicationId}`,
    ].filter(Boolean).join('\n')

    lines.push(
      'BEGIN:VEVENT',
      fold(`UID:${record.id}-${kind}@phdbench`),
      `DTSTAMP:${now}`,
      `DTSTART:${toICSDate(instant)}`,
      // A deadline is a moment, not a span; 30 minutes keeps it visible in a
      // week view without blocking out the day.
      `DTEND:${toICSDate(new Date(instant.getTime() + 30 * 60000))}`,
      fold(`SUMMARY:${escapeText(summary)}`),
    )

    if (description) lines.push(fold(`DESCRIPTION:${escapeText(description)}`))
    if (record.university) lines.push(fold(`LOCATION:${escapeText(record.university)}`))

    // Reminders are the entire point of exporting, so every event carries them.
    for (const days of alarmDaysBefore) {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        fold(`DESCRIPTION:${escapeText(summary)}`),
        `TRIGGER:-P${days}D`,
        'END:VALARM',
      )
    }

    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  // RFC 5545 requires CRLF line endings.
  return lines.join('\r\n')
}

export function downloadICS(content, filename = 'phdbench-deadlines.ics') {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Revoke on the next tick — revoking immediately can cancel the download in
  // some browsers before it has started reading the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
