// src/lib/derive.js
// Pure derivations over application data. No React, no Firestore — so they can
// be unit-tested directly and reused by both the UI and the attention engine.

import { LOR_STATUSES, SUBMITTED_STAGES, PREPARING_STAGES } from './model'

/**
 * How many required documents are ticked off.
 *
 * The denominator counts only documents that still exist. The previous
 * implementation divided by `requiredDocs.length` while the detail panel
 * filtered against the live document list, so deleting a document type left a
 * progress bar that could never reach 100% — and nothing on screen said why.
 */
export function docsProgress(app, documents = []) {
  const liveIds = new Set(documents.map(d => d.id))
  const required = (app?.requiredDocs || []).filter(id => liveIds.has(id))
  const submitted = app?.submittedDocs || app?.docs || {}
  const done = required.filter(id => submitted[id]).length
  return { done, total: required.length, requiredIds: required }
}

/**
 * Readiness across everything an application needs, not just its documents.
 *
 * Charter #5: a bar that reads 0% before you have done anything wrong is
 * discouraging and inaccurate — creating the application, choosing a lab and
 * writing down why you want it *is* progress. So readiness counts the whole
 * picture rather than documents alone, and the numbers stay honest because each
 * component is really being measured.
 */
export function readiness(app, documents = []) {
  const checks = []

  const { done, total } = docsProgress(app, documents)
  checks.push({ label: 'Documents', done: total > 0 ? done : 0, total: total || 0, weight: 3 })

  const recs = app?.recommenders || []
  const recsDone = recs.filter(r => !LOR_STATUSES[r.status]?.blocking).length
  checks.push({ label: 'Recommendations', done: recsDone, total: recs.length, weight: 3 })

  // The groundwork that makes an application possible at all.
  const basics = [
    Boolean(app?.university),
    Boolean(app?.professor),
    Boolean(app?.deadline),
    Boolean(app?.whyThisLab),
    Boolean(app?.sopAngle),
  ]
  checks.push({ label: 'Details', done: basics.filter(Boolean).length, total: basics.length, weight: 2 })

  const fee = app?.fee
  const feeSettled = Boolean(fee && (fee.paid || fee.waiverGranted || Number(fee.amount) === 0))
  checks.push({ label: 'Fee', done: feeSettled ? 1 : 0, total: fee ? 1 : 0, weight: 1 })

  const applicable = checks.filter(c => c.total > 0)
  const totalWeight = applicable.reduce((sum, c) => sum + c.weight, 0)
  const earned = applicable.reduce((sum, c) => sum + c.weight * (c.done / c.total), 0)

  return {
    percent: totalWeight === 0 ? 0 : Math.round((earned / totalWeight) * 100),
    checks: applicable,
  }
}

/** Applications that genuinely went out — the only ones stats should count. */
export const submittedApplications = (applications = []) =>
  applications.filter(a => SUBMITTED_STAGES.includes(a.stage))

export const preparingApplications = (applications = []) =>
  applications.filter(a => PREPARING_STAGES.includes(a.stage))

/**
 * Response rate over *submitted* applications only.
 *
 * The old calculation divided by every application including drafts, which made
 * the rate fall every time you started a new one — the number went down for
 * doing more work.
 */
export function responseRate(applications = []) {
  const sent = submittedApplications(applications)
  if (sent.length === 0) return null
  const responded = sent.filter(a => ['interview', 'offer', 'waitlist'].includes(a.stage)).length
  return { rate: Math.round((responded / sent.length) * 100), responded, sent: sent.length }
}

/** Reply rate on cold outreach — counted over applications that emailed at all. */
export function emailReplyRate(applications = []) {
  const emailed = applications.filter(a => a.emailed?.sentAt)
  if (emailed.length === 0) return null
  const replied = emailed.filter(a => a.emailed?.replied).length
  return { rate: Math.round((replied / emailed.length) * 100), replied, sent: emailed.length }
}

/** Unique universities and professors, for autocomplete and duplicate detection. */
export function knownEntities(applications = [], leads = []) {
  const all = [...applications, ...leads]
  const universities = new Set()
  const professors = new Set()
  const departments = new Set()
  const areas = new Set()

  for (const r of all) {
    if (r.university) universities.add(r.university.trim())
    if (r.professor) professors.add(r.professor.trim())
    if (r.professor2) professors.add(r.professor2.trim())
    if (r.department) departments.add(r.department.trim())
    if (r.researchArea) areas.add(r.researchArea.trim())
  }

  const sorted = (s) => [...s].filter(Boolean).sort((a, b) => a.localeCompare(b))
  return {
    universities: sorted(universities),
    professors: sorted(professors),
    departments: sorted(departments),
    researchAreas: sorted(areas),
  }
}

/**
 * Is this university + professor already tracked?
 * Catches the duplicate before it is created rather than after.
 */
export function findDuplicate({ university, professor }, applications = [], leads = [], excludeId = null) {
  if (!university) return null
  const norm = (s) => (s || '').trim().toLowerCase()
  const u = norm(university)
  const p = norm(professor)

  return [...applications, ...leads].find(r =>
    r.id !== excludeId &&
    norm(r.university) === u &&
    (!p || !norm(r.professor) || norm(r.professor) === p),
  ) || null
}
