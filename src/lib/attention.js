// src/lib/attention.js
// ─────────────────────────────────────────────────────────────────────────────
// What needs doing, right now.
//
// The old app could only answer "what deadlines exist". It could not answer the
// question that actually loses applications: *what is quietly going wrong*. A
// recommender who was never asked, a document nobody has ticked with a week to
// go, an English score that expires mid-cycle, an application still sitting in
// draft as its deadline arrives — none of these announce themselves.
//
// Every item is derived, never stored, so it cannot go stale.
// ─────────────────────────────────────────────────────────────────────────────

import { describeDeadline, daysUntil, isOverdue, URGENCY } from './datetime'
import { STAGE, STAGES, TESTS, LOR_STATUSES, isPreparing, isClosed } from './model'
import { docsProgress } from './derive'

export const SEVERITY = { CRITICAL: 'critical', WARNING: 'warning', INFO: 'info' }

const SEVERITY_RANK = { critical: 0, warning: 1, info: 2 }

/** How long silence after an outreach email counts as "chase this". */
const FOLLOWUP_SILENCE_DAYS = 21

/** How far ahead a lapsing test score becomes worth flagging. */
const SCORE_EXPIRY_HORIZON_DAYS = 120

function item({ id, severity, title, detail, action, href, appId, sortKey }) {
  return { id, severity, title, detail, action, href, appId, sortKey: sortKey ?? 9999 }
}

/**
 * Build the full attention list.
 *
 * `now` is injectable so this is testable and so the screenshot harness can
 * produce a deterministic dashboard.
 */
export function computeAttention({ applications = [], leads = [], documents = [], profile = null, now = new Date() } = {}) {
  const items = []
  const opts = { now }

  // ── Applications ──────────────────────────────────────────────────────────
  for (const app of applications) {
    if (isClosed(app.stage)) continue

    const label = app.university || 'Untitled application'
    const deadline = app.deadline
    const d = deadline ? describeDeadline(deadline, opts) : null
    const days = d?.days ?? null

    // Still a draft, and the deadline has passed. The most expensive failure
    // there is, and the old model could not even represent it.
    if (d?.overdue && isPreparing(app.stage)) {
      items.push(item({
        id: `overdue-draft-${app.id}`,
        severity: SEVERITY.CRITICAL,
        title: `${label} — deadline passed while still in ${STAGES[app.stage]?.label?.toLowerCase()}`,
        detail: 'Mark it as missed, or withdraw it, so it stops counting as live work.',
        action: 'Review',
        href: '/applications',
        appId: app.id,
        sortKey: -100,
      }))
      continue
    }

    // Deadline close and not yet sent.
    if (days !== null && !d.overdue && days <= 7 && isPreparing(app.stage)) {
      items.push(item({
        id: `closing-${app.id}`,
        severity: SEVERITY.CRITICAL,
        title: `${label} closes ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}`,
        detail: d.crossesDay
          ? `${d.schoolDate} ${d.schoolTime} at the university — ${d.homeDate} ${d.homeTime} your time.`
          : `Still at "${STAGES[app.stage]?.label}".`,
        action: 'Open',
        href: '/applications',
        appId: app.id,
        sortKey: days,
      }))
    } else if (days !== null && !d.overdue && days <= 21 && isPreparing(app.stage)) {
      items.push(item({
        id: `approaching-${app.id}`,
        severity: SEVERITY.WARNING,
        title: `${label} closes in ${days} days`,
        detail: `Still at "${STAGES[app.stage]?.label}".`,
        action: 'Open',
        href: '/applications',
        appId: app.id,
        sortKey: days,
      }))
    }

    // Recommenders who were never asked. A letter takes weeks; asking late is
    // the same as not asking.
    const unasked = (app.recommenders || []).filter(r => r.status === 'not_asked')
    if (unasked.length > 0 && days !== null && !d.overdue && days <= 45) {
      items.push(item({
        id: `lor-unasked-${app.id}`,
        severity: days <= 21 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
        title: `${label} — ${unasked.length} recommender${unasked.length > 1 ? 's have' : ' has'} not been asked`,
        detail: `The deadline is ${days} days away. Letters routinely take two to three weeks.`,
        action: 'Ask',
        href: '/applications',
        appId: app.id,
        sortKey: days,
      }))
    }

    // Letters promised but not delivered, with the deadline in sight.
    const outstanding = (app.recommenders || []).filter(
      r => r.status !== 'not_asked' && LOR_STATUSES[r.status]?.blocking,
    )
    if (outstanding.length > 0 && days !== null && !d.overdue && days <= 14) {
      items.push(item({
        id: `lor-outstanding-${app.id}`,
        severity: SEVERITY.WARNING,
        title: `${label} — ${outstanding.length} letter${outstanding.length > 1 ? 's' : ''} still outstanding`,
        detail: `${days} days left. A polite nudge is overdue.`,
        action: 'Nudge',
        href: '/applications',
        appId: app.id,
        sortKey: days,
      }))
    }

    // Documents unticked with the deadline near.
    if (documents.length > 0 && days !== null && !d.overdue && days <= 14) {
      const { done, total } = docsProgress(app, documents)
      if (total > 0 && done < total) {
        items.push(item({
          id: `docs-${app.id}`,
          severity: days <= 7 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
          title: `${label} — ${total - done} of ${total} documents still outstanding`,
          detail: `${days} days until the deadline.`,
          action: 'Open',
          href: '/applications',
          appId: app.id,
          sortKey: days,
        }))
      }
    }

    // Emailed, no reply, and long enough that a nudge is warranted.
    if (app.emailed?.sentAt && !app.emailed.replied) {
      const silence = -(daysUntil(app.emailed.sentAt, opts) ?? 0)
      if (silence >= FOLLOWUP_SILENCE_DAYS) {
        items.push(item({
          id: `silence-${app.id}`,
          severity: SEVERITY.INFO,
          title: `${label} — no reply in ${silence} days`,
          detail: `You emailed ${app.professor || 'the professor'} and have not heard back.`,
          action: 'Follow up',
          href: '/applications',
          appId: app.id,
          sortKey: 500 - silence,
        }))
      }
    }

    // An offer with an acceptance deadline is the highest-stakes clock there is.
    if (app.stage === STAGE.OFFER && app.expectedDecision) {
      const decisionDays = daysUntil(app.expectedDecision, opts)
      if (decisionDays !== null && decisionDays >= 0 && decisionDays <= 30) {
        items.push(item({
          id: `offer-${app.id}`,
          severity: decisionDays <= 7 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
          title: `${label} — offer response due in ${decisionDays} days`,
          detail: 'Accept, decline, or ask for an extension.',
          action: 'Open',
          href: '/applications',
          appId: app.id,
          sortKey: decisionDays - 50,
        }))
      }
    }

    // Migrated records the owner has not confirmed.
    if (app.needsReview) {
      items.push(item({
        id: `review-${app.id}`,
        severity: SEVERITY.INFO,
        title: `${label} — confirm its real stage`,
        detail: 'Migrated from the old format. PhDBench did not guess whether it was actually submitted.',
        action: 'Confirm',
        href: '/applications',
        appId: app.id,
        sortKey: 800,
      }))
    }
  }

  // ── Leads ─────────────────────────────────────────────────────────────────
  for (const lead of leads) {
    if (lead.state && lead.state !== 'active') continue

    if (lead.deadline) {
      const days = daysUntil(lead.deadline, opts)
      const past = isOverdue(lead.deadline, opts)

      if (past) {
        items.push(item({
          id: `lead-expired-${lead.id}`,
          severity: SEVERITY.INFO,
          title: `${lead.university} — the window has closed`,
          detail: 'Mark it as passed so it stops sitting in your active leads.',
          action: 'Triage',
          href: '/leads',
          sortKey: 900,
        }))
      } else if (days !== null && days <= 14) {
        items.push(item({
          id: `lead-closing-${lead.id}`,
          severity: days <= 7 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
          title: `${lead.university} closes in ${days} day${days === 1 ? '' : 's'} and is still only a lead`,
          detail: 'Convert it to an application, or let it go deliberately rather than by accident.',
          action: 'Convert',
          href: '/leads',
          sortKey: days,
        }))
      }
    }

    // A lead that has opened and is being ignored.
    if (lead.startDate && !lead.deadline) {
      const opened = daysUntil(lead.startDate, opts)
      if (opened !== null && opened <= 0 && opened > -30) {
        items.push(item({
          id: `lead-open-${lead.id}`,
          severity: SEVERITY.INFO,
          title: `${lead.university} applications are open`,
          detail: 'It opened recently and has not been converted yet.',
          action: 'Convert',
          href: '/leads',
          sortKey: 700,
        }))
      }
    }
  }

  // ── Profile: test scores and credential evaluation ────────────────────────
  for (const score of profile?.testScores || []) {
    if (!score.expiresOn) continue
    const days = daysUntil(score.expiresOn, opts)
    if (days === null) continue

    const name = TESTS[score.type]?.label || score.type

    if (days < 0) {
      items.push(item({
        id: `score-expired-${score.id}`,
        severity: SEVERITY.WARNING,
        title: `Your ${name} score has expired`,
        detail: `It lapsed ${Math.abs(days)} days ago. Most programmes will not accept it, even by a day.`,
        action: 'Review',
        href: '/settings',
        sortKey: 600,
      }))
    } else if (days <= SCORE_EXPIRY_HORIZON_DAYS) {
      items.push(item({
        id: `score-expiring-${score.id}`,
        severity: days <= 45 ? SEVERITY.WARNING : SEVERITY.INFO,
        title: `Your ${name} score expires in ${days} days`,
        detail: 'Any application whose deadline falls after that date needs a fresh score.',
        action: 'Review',
        href: '/settings',
        sortKey: days,
      }))
    }
  }

  for (const evaluation of profile?.credentialEvals || []) {
    if (evaluation.status === 'not_started') {
      items.push(item({
        id: `eval-${evaluation.id}`,
        severity: SEVERITY.INFO,
        title: `${evaluation.provider} credential evaluation not started`,
        detail: 'These routinely take four to six weeks, and many US programmes will not review without one.',
        action: 'Update',
        href: '/settings',
        sortKey: 750,
      }))
    }
  }

  // Backup nag, but only once there is something worth losing.
  const worthBackingUp = applications.length + leads.length >= 5
  if (worthBackingUp) {
    const lastExport = profile?.lastExportAt?.seconds
      ? new Date(profile.lastExportAt.seconds * 1000)
      : null
    const daysSince = lastExport
      ? Math.floor((now.getTime() - lastExport.getTime()) / 86400000)
      : null

    if (daysSince === null || daysSince > 30) {
      items.push(item({
        id: 'backup',
        severity: SEVERITY.INFO,
        title: daysSince === null ? 'You have never exported a backup' : `Last backup was ${daysSince} days ago`,
        detail: 'A backup is the one thing archive and undo cannot replace.',
        action: 'Export',
        href: '/settings?action=export',
        sortKey: 950,
      }))
    }
  }

  items.sort((a, b) => {
    const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    return bySeverity !== 0 ? bySeverity : a.sortKey - b.sortKey
  })

  return items
}

export function attentionCounts(items) {
  return {
    total: items.length,
    critical: items.filter(i => i.severity === SEVERITY.CRITICAL).length,
    warning: items.filter(i => i.severity === SEVERITY.WARNING).length,
    info: items.filter(i => i.severity === SEVERITY.INFO).length,
  }
}
