// src/lib/db.js — every Firestore operation for PhDBench.
//
// Two rules hold throughout this file:
//
//   1. Nothing is ever hard-deleted by an ordinary action. "Delete" sets
//      `archivedAt`, which hides the record everywhere while keeping it intact.
//      Permanent removal exists, but only as an explicit call from the Archive.
//
//   2. Every function either succeeds or throws. Callers wrap them with
//      `useMutation`, which turns a throw into a visible message. The previous
//      version let failures vanish, which for a tracker holding data you cannot
//      reconstruct is the most damaging bug available.

import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDocs, getDoc, onSnapshot, query, orderBy,
  serverTimestamp, writeBatch, deleteField,
} from 'firebase/firestore'
import { db } from './firebase'
import { STAGE, LEAD_STATE, DEFAULT_DOCUMENTS, LEGACY_STATUS_TO_STAGE } from './model'

// ─── Path helpers ────────────────────────────────────────────────────────────

const userCol = (uid, col) => collection(db, 'users', uid, col)
const userDoc = (uid, col, id) => doc(db, 'users', uid, col, id)
const subCol  = (uid, appId, col) => collection(db, 'users', uid, 'applications', appId, col)
const subDoc  = (uid, appId, col, id) => doc(db, 'users', uid, 'applications', appId, col, id)

/** The profile is a single well-known document, not a collection. */
const profileDoc = (uid) => doc(db, 'users', uid, 'profile', 'main')

const snapToArray = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }))

/**
 * Archived records are filtered in memory rather than with a `where` clause.
 *
 * A Firestore query combining `where('archivedAt','==',null)` with an `orderBy`
 * needs a composite index, which has to be deployed and kept in step with the
 * code. At this data volume — hundreds of records, not millions — filtering
 * client-side costs nothing measurable and removes an entire class of
 * "the query works locally but the index is missing in production" failure.
 */
export const isArchived = (record) => Boolean(record?.archivedAt)
export const activeOnly = (records) => records.filter(r => !isArchived(r))
export const archivedOnly = (records) => records.filter(isArchived)

// ─── Realtime subscriptions ──────────────────────────────────────────────────
//
// The app subscribes once and receives every subsequent change automatically.
// The previous version re-fetched an entire collection after every mutation,
// which is slower, costs more reads, and produced at least one visible bug: the
// detail panel read from state that had not been refreshed yet and showed
// pre-edit values after a save.
//
// Each subscribe function returns its unsubscribe callback.

function subscribeToCollection(colRef, orderField, onData, onError) {
  return onSnapshot(
    query(colRef, orderBy(orderField, 'desc')),
    (snap) => onData(snapToArray(snap)),
    (error) => {
      console.error('Subscription failed:', error)
      onError?.(error)
    },
  )
}

export const subscribeLeads = (uid, onData, onError) =>
  subscribeToCollection(userCol(uid, 'leads'), 'createdAt', onData, onError)

export const subscribeApplications = (uid, onData, onError) =>
  subscribeToCollection(userCol(uid, 'applications'), 'createdAt', onData, onError)

export function subscribeDocuments(uid, onData, onError) {
  return onSnapshot(
    query(userCol(uid, 'documents'), orderBy('order', 'asc')),
    (snap) => onData(snapToArray(snap)),
    (error) => { console.error('Documents subscription failed:', error); onError?.(error) },
  )
}

export function subscribeProfile(uid, onData, onError) {
  return onSnapshot(
    profileDoc(uid),
    (snap) => onData(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (error) => { console.error('Profile subscription failed:', error); onError?.(error) },
  )
}

export const subscribeFollowups = (uid, appId, onData, onError) =>
  subscribeToCollection(subCol(uid, appId, 'followups'), 'createdAt', onData, onError)

export const subscribeActivity = (uid, appId, onData, onError) =>
  subscribeToCollection(subCol(uid, appId, 'activity'), 'createdAt', onData, onError)

// ─── Leads ───────────────────────────────────────────────────────────────────

export async function addLead(uid, data) {
  const ref = await addDoc(userCol(uid, 'leads'), {
    ...data,
    state: data.state || LEAD_STATE.ACTIVE,
    archivedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export function updateLead(uid, id, data) {
  return updateDoc(userDoc(uid, 'leads', id), { ...data, updatedAt: serverTimestamp() })
}

/** Reversible. This is what the delete button actually calls. */
export function archiveLead(uid, id) {
  return updateDoc(userDoc(uid, 'leads', id), {
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export function restoreLead(uid, id) {
  return updateDoc(userDoc(uid, 'leads', id), {
    archivedAt: deleteField(),
    updatedAt: serverTimestamp(),
  })
}

/** Irreversible. Only reachable from the Archive, behind a hold-to-confirm. */
export function destroyLead(uid, id) {
  return deleteDoc(userDoc(uid, 'leads', id))
}

/** Triage without deleting: rule a lead out but keep the record. */
export function setLeadState(uid, id, state) {
  return updateDoc(userDoc(uid, 'leads', id), { state, updatedAt: serverTimestamp() })
}

// ─── Applications ────────────────────────────────────────────────────────────

export async function addApplication(uid, data) {
  const ref = await addDoc(userCol(uid, 'applications'), {
    ...data,
    // A new application has not been sent. The old code stamped `applied`
    // on creation, which is what made drafts count as submissions.
    stage: data.stage || STAGE.NOT_STARTED,
    requiredDocs: data.requiredDocs || [],
    submittedDocs: data.submittedDocs || {},
    archivedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await logActivity(uid, ref.id, 'Application created', { system: true })
  return ref.id
}

export function updateApplication(uid, id, data) {
  return updateDoc(userDoc(uid, 'applications', id), { ...data, updatedAt: serverTimestamp() })
}

/**
 * Stage transitions are their own operation because they carry consequences:
 * reaching `submitted` records when, a decision records its date, and every
 * move writes itself into the activity log.
 *
 * The old activity log was manual-only, so unless you remembered to type a note
 * the timeline was empty — exactly when you most want to know what happened when.
 */
export async function setApplicationStage(uid, id, stage, { previousStage, label } = {}) {
  const patch = { stage, updatedAt: serverTimestamp() }

  if (stage === STAGE.SUBMITTED) patch.submittedAt = serverTimestamp()
  if ([STAGE.OFFER, STAGE.REJECTED, STAGE.WAITLIST, STAGE.WITHDRAWN].includes(stage)) {
    patch.decidedAt = serverTimestamp()
  }

  await updateDoc(userDoc(uid, 'applications', id), patch)
  await logActivity(
    uid, id,
    previousStage ? `Stage: ${previousStage} → ${label || stage}` : `Stage set to ${label || stage}`,
    { system: true },
  )
}

export function archiveApplication(uid, id) {
  return updateDoc(userDoc(uid, 'applications', id), {
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export function restoreApplication(uid, id) {
  return updateDoc(userDoc(uid, 'applications', id), {
    archivedAt: deleteField(),
    updatedAt: serverTimestamp(),
  })
}

/**
 * Irreversible, and deeper than it looks: an application owns `followups` and
 * `activity` subcollections. Deleting only the parent document leaves those
 * orphaned and unreachable, quietly consuming storage forever, because Firestore
 * does not cascade. This removes the children first.
 */
export async function destroyApplication(uid, id) {
  for (const name of ['followups', 'activity']) {
    const snap = await getDocs(subCol(uid, id, name))
    // Batches cap at 500 operations.
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db)
      snap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref))
      await batch.commit()
    }
  }
  await deleteDoc(userDoc(uid, 'applications', id))
}

/**
 * Promote a lead into a full application.
 *
 * The important change from the previous version: the new application starts at
 * `in_progress`, not `applied`. Converting a lead means you have decided to
 * apply — it does not mean you have applied.
 */
export async function promoteLeadToApplication(uid, leadId, extraData = {}) {
  const leadSnap = await getDoc(userDoc(uid, 'leads', leadId))
  if (!leadSnap.exists()) throw new Error('That lead no longer exists.')

  const leadData = leadSnap.data()
  const batch = writeBatch(db)
  const appRef = doc(userCol(uid, 'applications'))

  // Strip lead-only bookkeeping so it cannot masquerade as application state.
  const { state, archivedAt, convertedToApp, createdAt, updatedAt, ...carried } = leadData

  batch.set(appRef, {
    ...carried,
    ...extraData,
    fromLeadId: leadId,
    stage: extraData.stage || STAGE.IN_PROGRESS,
    requiredDocs: extraData.requiredDocs || [],
    submittedDocs: extraData.submittedDocs || {},
    archivedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  batch.update(userDoc(uid, 'leads', leadId), {
    convertedToApp: appRef.id,
    state: LEAD_STATE.CONVERTED,
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
  await logActivity(uid, appRef.id, 'Converted from a saved lead', { system: true })
  return appRef.id
}

// ─── Follow-ups ──────────────────────────────────────────────────────────────

export async function addFollowup(uid, appId, data) {
  const ref = await addDoc(subCol(uid, appId, 'followups'), {
    ...data,
    replied: data.replied ?? false,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export function updateFollowup(uid, appId, fid, data) {
  return updateDoc(subDoc(uid, appId, 'followups', fid), data)
}

export function deleteFollowup(uid, appId, fid) {
  return deleteDoc(subDoc(uid, appId, 'followups', fid))
}

// ─── Activity log ────────────────────────────────────────────────────────────

/**
 * `system: true` marks entries the app wrote itself, so the timeline can
 * distinguish "PhDBench recorded this" from "you wrote this".
 */
export async function logActivity(uid, appId, note, { system = false } = {}) {
  try {
    await addDoc(subCol(uid, appId, 'activity'), {
      note,
      system,
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    // A failed log entry must never take down the operation it was describing.
    // The user's stage change succeeding matters more than its audit line.
    console.error('Could not write activity entry:', error)
  }
}

export const addActivityEntry = (uid, appId, note) => logActivity(uid, appId, note, { system: false })

export function deleteActivityEntry(uid, appId, aid) {
  return deleteDoc(subDoc(uid, appId, 'activity', aid))
}

// ─── Documents ───────────────────────────────────────────────────────────────

export async function getDocuments(uid) {
  const snap = await getDocs(query(userCol(uid, 'documents'), orderBy('order', 'asc')))
  return snapToArray(snap)
}

export async function addDocument(uid, data) {
  const existing = await getDocuments(uid)
  const ref = await addDoc(userCol(uid, 'documents'), {
    ...data,
    order: data.order ?? existing.length,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export function updateDocument(uid, id, data) {
  return updateDoc(userDoc(uid, 'documents', id), { ...data, updatedAt: serverTimestamp() })
}

/**
 * Removing a document type has to clean up after itself.
 *
 * Applications store document *ids* in `requiredDocs` and `submittedDocs`.
 * Previously, deleting a type left those ids dangling: the progress bar kept
 * counting a document that no longer existed in its denominator while the
 * detail panel filtered it out of the numerator, so the bar could never reach
 * 100% and nothing on screen explained why.
 */
export async function deleteDocument(uid, id) {
  const appsSnap = await getDocs(userCol(uid, 'applications'))
  const affected = appsSnap.docs.filter(d => {
    const data = d.data()
    return (data.requiredDocs || []).includes(id) || (data.submittedDocs || {})[id] !== undefined
  })

  for (let i = 0; i < affected.length; i += 400) {
    const batch = writeBatch(db)
    affected.slice(i, i + 400).forEach(d => {
      const data = d.data()
      const submitted = { ...(data.submittedDocs || {}) }
      delete submitted[id]
      batch.update(d.ref, {
        requiredDocs: (data.requiredDocs || []).filter(docId => docId !== id),
        submittedDocs: submitted,
        updatedAt: serverTimestamp(),
      })
    })
    await batch.commit()
  }

  await deleteDoc(userDoc(uid, 'documents', id))
  return affected.length
}

export async function reorderDocuments(uid, orderedIds) {
  const batch = writeBatch(db)
  orderedIds.forEach((id, index) => {
    batch.update(userDoc(uid, 'documents', id), { order: index })
  })
  await batch.commit()
}

/**
 * Seed the document checklist on first run.
 *
 * The previous version defined this function and never called it from anywhere,
 * so a fresh account had no document types at all — and the application form
 * showed an empty checklist pointing at a Settings link that 404'd.
 */
export async function ensureDefaultDocuments(uid) {
  const existing = await getDocuments(uid)
  if (existing.length > 0) return existing.length

  const batch = writeBatch(db)
  DEFAULT_DOCUMENTS.forEach((name, index) => {
    batch.set(doc(userCol(uid, 'documents')), {
      name,
      order: index,
      createdAt: serverTimestamp(),
    })
  })
  await batch.commit()
  return DEFAULT_DOCUMENTS.length
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function getProfile(uid) {
  const snap = await getDoc(profileDoc(uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export function saveProfile(uid, data) {
  // Merge, so a partial save never wipes fields it did not mention.
  return setDoc(profileDoc(uid), { ...data, updatedAt: serverTimestamp() }, { merge: true })
}

// ─── One-time migration to the v2 shape ──────────────────────────────────────

/**
 * Bring pre-v2 records up to the current schema.
 *
 * Deliberately lossless and deliberately non-committal. The legacy `status`
 * field is preserved rather than overwritten, and no application is assumed to
 * have been submitted — under the old model a card became "applied" the moment
 * a lead was converted, whether or not anything had been sent. Guessing would
 * manufacture a submission history that never happened, so every migrated
 * application is flagged `needsReview` and the owner confirms each one.
 *
 * Safe to run repeatedly: already-migrated records are skipped.
 */
export async function migrateToV2(uid) {
  const result = { applications: 0, leads: 0, alreadyCurrent: 0 }

  const appsSnap = await getDocs(userCol(uid, 'applications'))
  const appsToMigrate = appsSnap.docs.filter(d => !d.data().schemaVersion)

  for (let i = 0; i < appsToMigrate.length; i += 400) {
    const batch = writeBatch(db)
    appsToMigrate.slice(i, i + 400).forEach(d => {
      const data = d.data()
      const legacyStatus = data.status
      batch.update(d.ref, {
        schemaVersion: 2,
        stage: LEGACY_STATUS_TO_STAGE[legacyStatus] || STAGE.IN_PROGRESS,
        legacyStatus: legacyStatus ?? null,
        // The owner confirms the real stage; nothing is inferred silently.
        needsReview: true,
        // `emailed` was a status; it is now an action that can coexist with any
        // stage. Preserve the fact that an email went out.
        emailed: data.emailSentDate || legacyStatus === 'emailed'
          ? {
              sentAt: data.emailSentDate || null,
              subject: data.emailSubject || null,
              replied: Boolean(data.emailReplied),
            }
          : null,
        archivedAt: data.archivedAt ?? null,
        requiredDocs: data.requiredDocs || [],
        submittedDocs: data.submittedDocs || data.docs || {},
        updatedAt: serverTimestamp(),
      })
    })
    await batch.commit()
    result.applications += Math.min(400, appsToMigrate.length - i)
  }

  const leadsSnap = await getDocs(userCol(uid, 'leads'))
  const leadsToMigrate = leadsSnap.docs.filter(d => !d.data().schemaVersion)

  for (let i = 0; i < leadsToMigrate.length; i += 400) {
    const batch = writeBatch(db)
    leadsToMigrate.slice(i, i + 400).forEach(d => {
      const data = d.data()
      batch.update(d.ref, {
        schemaVersion: 2,
        state: data.status === 'converted' ? LEAD_STATE.CONVERTED : LEAD_STATE.ACTIVE,
        legacyStatus: data.status ?? null,
        archivedAt: data.archivedAt ?? null,
        updatedAt: serverTimestamp(),
      })
    })
    await batch.commit()
    result.leads += Math.min(400, leadsToMigrate.length - i)
  }

  result.alreadyCurrent =
    (appsSnap.size - appsToMigrate.length) + (leadsSnap.size - leadsToMigrate.length)

  await saveProfile(uid, { schemaVersion: 2, migratedAt: serverTimestamp() })
  return result
}

export function clearNeedsReview(uid, appId) {
  return updateDoc(userDoc(uid, 'applications', appId), {
    needsReview: deleteField(),
    updatedAt: serverTimestamp(),
  })
}

// ─── Export and import ───────────────────────────────────────────────────────

/**
 * Read the entire dataset, including subcollections and archived records.
 *
 * This is the backup that covers the failure archive and undo cannot: the
 * Firebase project itself being lost, misconfigured, or made unreachable by a
 * rules mistake. The output is plain JSON and readable without any of this app.
 */
export async function exportEverything(uid) {
  const [leadsSnap, appsSnap, docsSnap, profileSnap] = await Promise.all([
    getDocs(userCol(uid, 'leads')),
    getDocs(userCol(uid, 'applications')),
    getDocs(userCol(uid, 'documents')),
    getDoc(profileDoc(uid)),
  ])

  const applications = []
  for (const d of appsSnap.docs) {
    const [followups, activity] = await Promise.all([
      getDocs(subCol(uid, d.id, 'followups')),
      getDocs(subCol(uid, d.id, 'activity')),
    ])
    applications.push({
      id: d.id,
      ...d.data(),
      followups: snapToArray(followups),
      activity: snapToArray(activity),
    })
  }

  return {
    format: 'phdbench-backup',
    formatVersion: 2,
    exportedAt: new Date().toISOString(),
    counts: {
      leads: leadsSnap.size,
      applications: appsSnap.size,
      documents: docsSnap.size,
    },
    profile: profileSnap.exists() ? profileSnap.data() : null,
    leads: snapToArray(leadsSnap),
    applications,
    documents: snapToArray(docsSnap),
  }
}

/**
 * Restore from a backup file.
 *
 * Additive by default: existing records are left alone and imported ones are
 * written under fresh ids, so importing can never destroy what is already there.
 * A restore-over-the-top is a different, more dangerous operation and is not
 * offered here.
 */
export async function importBackup(uid, payload) {
  if (payload?.format !== 'phdbench-backup') {
    throw new Error('That file is not a PhDBench backup.')
  }

  const imported = { leads: 0, applications: 0, documents: 0, followups: 0, activity: 0 }
  const stamp = new Date().toISOString()

  for (const lead of payload.leads || []) {
    const { id, ...data } = lead
    await addDoc(userCol(uid, 'leads'), { ...data, importedAt: stamp, importedFromId: id })
    imported.leads++
  }

  for (const document of payload.documents || []) {
    const { id, ...data } = document
    await addDoc(userCol(uid, 'documents'), { ...data, importedAt: stamp, importedFromId: id })
    imported.documents++
  }

  for (const application of payload.applications || []) {
    const { id, followups = [], activity = [], ...data } = application
    const ref = await addDoc(userCol(uid, 'applications'), {
      ...data, importedAt: stamp, importedFromId: id,
    })
    for (const f of followups) {
      const { id: fid, ...fdata } = f
      await addDoc(subCol(uid, ref.id, 'followups'), fdata)
      imported.followups++
    }
    for (const a of activity) {
      const { id: aid, ...adata } = a
      await addDoc(subCol(uid, ref.id, 'activity'), adata)
      imported.activity++
    }
    imported.applications++
  }

  if (payload.profile) {
    await saveProfile(uid, { ...payload.profile, importedAt: stamp })
  }

  return imported
}
