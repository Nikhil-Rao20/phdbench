// src/lib/migrateToGroups.js
// ─────────────────────────────────────────────────────────────────────────────
// Move a private lead list onto a shared board.
//
// Three promises govern this file, in order of importance:
//
//   1. Applications are never read, written, or moved. Not one field. The
//      portal links, fees, SOP notes and document ticks are untouched by every
//      code path here.
//   2. Leads are COPIED, not moved. The originals stay at users/{uid}/leads
//      exactly as they were, so a bad outcome is recoverable by pointing back
//      at them rather than by restoring a backup.
//   3. Running it twice does nothing the second time. Every copied lead records
//      where it came from, and an already-copied lead is skipped.
//
// The conversions a lead needs on the way:
//   - `state`, `priority`, `fitScore`, `archivedAt` are personal, so they move
//     into `states.{uid}` rather than staying at the top level where they would
//     read as the group's shared opinion.
//   - A converted lead stays converted for the migrating user and appears
//     active for everyone else, because nobody else has an entry yet.
// ─────────────────────────────────────────────────────────────────────────────

import {
  collection, doc, getDocs, getDoc, writeBatch, serverTimestamp, query, where, limit,
} from 'firebase/firestore'
import { db } from './firebase'
import { LEAD_STATE } from './model'

const BATCH_SIZE = 200

/** Shape one private lead as a shared one. Pure, so it can be tested directly. */
export function toSharedLead(lead, user) {
  const {
    id, state, priority, fitScore, archivedAt, status, legacyStatus,
    convertedToApp, schemaVersion, ...shared
  } = lead

  return {
    ...shared,
    addedBy: user.uid,
    addedByName: user.displayName || '',
    addedByEmail: String(user.email || '').toLowerCase(),

    states: {
      [user.uid]: {
        // A lead already converted stays converted for this person — and only
        // for this person. Everyone else has no entry, so it reads as active on
        // their board, which is what makes those positions newly visible to them.
        state: state || (convertedToApp ? LEAD_STATE.CONVERTED : LEAD_STATE.ACTIVE),
        priority: priority || null,
        fitScore: fitScore || 0,
        archivedAt: archivedAt || null,
        convertedToApp: convertedToApp || null,
        updatedAt: Date.now(),
      },
    },

    // The provenance that makes a second run a no-op.
    migratedFromLeadId: id,
    migratedAt: Date.now(),
    schemaVersion: 3,
  }
}

/**
 * What a migration would do, without doing any of it.
 * Shown to the user before they commit, because "it copied the wrong things" is
 * only recoverable if they saw the list first.
 */
export async function planGroupMigration(uid, groupId) {
  const privateLeads = await getDocs(collection(db, 'users', uid, 'leads'))
  const existing = await getDocs(collection(db, 'groups', groupId, 'leads'))

  const alreadyCopied = new Set(
    existing.docs.map(d => d.data().migratedFromLeadId).filter(Boolean),
  )

  const all = privateLeads.docs.map(d => ({ id: d.id, ...d.data() }))
  const toCopy = all.filter(l => !alreadyCopied.has(l.id))

  return {
    total: all.length,
    toCopy: toCopy.length,
    skipped: all.length - toCopy.length,
    leads: toCopy,
    byState: toCopy.reduce((acc, l) => {
      const key = l.state || 'active'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {}),
  }
}

/**
 * Copy the leads.
 *
 * Batched, because a write per document would be slow and could half-finish
 * with no clear boundary. Each batch commits atomically; a failure part-way
 * leaves whole batches applied, and re-running skips exactly those.
 */
export async function migrateLeadsToGroup(uid, groupId, user, { onProgress } = {}) {
  const plan = await planGroupMigration(uid, groupId)
  if (plan.toCopy === 0) {
    return { copied: 0, skipped: plan.skipped, total: plan.total }
  }

  const target = collection(db, 'groups', groupId, 'leads')
  let copied = 0

  for (let i = 0; i < plan.leads.length; i += BATCH_SIZE) {
    const chunk = plan.leads.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)

    chunk.forEach(lead => {
      const payload = toSharedLead(lead, user)
      // A fresh id: reusing the private one would tie the copy to the original
      // and make "the originals are untouched" harder to reason about.
      batch.set(doc(target), { ...payload, createdAt: lead.createdAt || serverTimestamp() })
    })

    await batch.commit()
    copied += chunk.length
    onProgress?.({ copied, total: plan.toCopy })
  }

  return { copied, skipped: plan.skipped, total: plan.total }
}

/**
 * Link applications to their copied leads, without touching the applications.
 *
 * An application's `fromLeadId` points at a private lead that is no longer the
 * one on the board. Rather than rewrite the applications — which the first
 * promise of this file forbids — the mapping is returned for the interface to
 * resolve at read time.
 */
export async function buildLeadIdMap(groupId) {
  const snap = await getDocs(collection(db, 'groups', groupId, 'leads'))
  const map = {}
  snap.docs.forEach(d => {
    const from = d.data().migratedFromLeadId
    if (from) map[from] = d.id
  })
  return map
}
