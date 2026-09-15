// src/lib/groupsDb.js
// ─────────────────────────────────────────────────────────────────────────────
// Groups, shared leads, and the access queue.
//
// The shape that makes a shared board work:
//
//   groups/{gid}                    name, createdBy, members{}, memberEmails[]
//   groups/{gid}/leads/{leadId}     shared facts + states{uid: {...}}
//   accessRequests/{uid}            the approval queue
//
// A lead's facts are common to the group; what each person has decided about it
// lives under their own uid inside `states`. Writing `states.<myUid>` is the
// only way a member changes their own view, and it cannot disturb anyone
// else's — which is the entire reason one board can serve several applicants
// with different opinions about the same lab.
// ─────────────────────────────────────────────────────────────────────────────

import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDocs, getDoc, onSnapshot, query, orderBy, where, limit, startAfter,
  serverTimestamp, writeBatch, increment, arrayUnion, arrayRemove,
} from 'firebase/firestore'
import { db } from './firebase'
import { STAGE, LEAD_STATE } from './model'
import { ROLE, ACCESS, LIMITS, isAdmin } from './access'
import { clampFields } from './safety'

const groupCol = () => collection(db, 'groups')
const groupDoc = (gid) => doc(db, 'groups', gid)
const leadsCol = (gid) => collection(db, 'groups', gid, 'leads')
const leadDoc = (gid, leadId) => doc(db, 'groups', gid, 'leads', leadId)
const requestDoc = (uid) => doc(db, 'accessRequests', uid)
const requestsCol = () => collection(db, 'accessRequests')

/** Per-user counters, so the rules can enforce a cap without counting. */
const countsDoc = (uid) => doc(db, 'users', uid, 'meta', 'counts')

const snapToArray = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }))

const normaliseEmail = (email) => String(email || '').trim().toLowerCase()

// ─── Access requests ─────────────────────────────────────────────────────────

export function subscribeMyAccessRequest(uid, onData, onError) {
  return onSnapshot(
    requestDoc(uid),
    (snap) => onData(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    onError,
  )
}

/**
 * Ask for access.
 *
 * `status` is pinned to pending here and immutable to the requester in the
 * rules. Both matter: without the rule, anyone could sign in and write
 * themselves an approved record and the queue would be decorative.
 */
export async function requestAccess(user, form) {
  const payload = clampFields({
    uid: user.uid,
    email: normaliseEmail(user.email),
    googleName: user.displayName || '',
    photoURL: user.photoURL || '',
    name: (form.name || '').trim(),
    link: (form.link || '').trim(),
    position: form.position || '',
    location: (form.location || '').trim(),
    applyingFor: (form.applyingFor || '').trim(),
    applyingTo: form.applyingTo || '',
    heardFrom: (form.heardFrom || '').trim(),
    note: (form.note || '').trim(),
    status: ACCESS.PENDING,
    requestedAt: serverTimestamp(),
  })
  await setDoc(requestDoc(user.uid), payload)
  return payload
}

/** Correct a submission while it is still pending or after a refusal. */
export function updateMyRequest(uid, patch) {
  return updateDoc(requestDoc(uid), {
    ...clampFields(patch),
    updatedAt: serverTimestamp(),
  })
}

// ── Administrator only ───────────────────────────────────────────────────────

export function subscribeAccessRequests(onData, onError) {
  const q = query(requestsCol(), orderBy('requestedAt', 'desc'), limit(200))
  return onSnapshot(q, (snap) => onData(snapToArray(snap)), onError)
}

export function decideRequest(uid, status, { decidedBy, note = '' } = {}) {
  return updateDoc(requestDoc(uid), {
    status,
    decidedAt: serverTimestamp(),
    decidedBy: decidedBy || null,
    decisionNote: note,
  })
}

export const approveRequest = (uid, decidedBy) =>
  decideRequest(uid, ACCESS.APPROVED, { decidedBy })

export const rejectRequest = (uid, decidedBy, note) =>
  decideRequest(uid, ACCESS.REJECTED, { decidedBy, note })

// ─── Groups ──────────────────────────────────────────────────────────────────

/**
 * The groups this person belongs to.
 *
 * Queried by email rather than uid so somebody can be invited before they have
 * ever signed in — at that moment no uid for them exists anywhere.
 */
export function subscribeMyGroups(user, onData, onError) {
  const email = normaliseEmail(user?.email)
  if (!email) { onData([]); return () => {} }

  const q = query(
    groupCol(),
    where('memberEmails', 'array-contains', email),
    orderBy('createdAt', 'asc'),
    limit(LIMITS.groups),
  )
  return onSnapshot(q, (snap) => onData(snapToArray(snap)), onError)
}

export async function createGroup(user, name) {
  const email = normaliseEmail(user.email)
  const payload = {
    name: (name || 'My group').trim().slice(0, 120),
    createdBy: user.uid,
    createdByEmail: email,
    // Both shapes are kept: uid for cheap rule checks once someone has signed
    // in, email so an invitation can precede their first sign-in.
    members: {
      [user.uid]: { role: ROLE.ADMIN, email, name: user.displayName || '', joinedAt: Date.now() },
    },
    memberEmails: [email],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const ref = await addDoc(groupCol(), payload)
  return ref.id
}

export function renameGroup(gid, name) {
  return updateDoc(groupDoc(gid), {
    name: String(name || '').trim().slice(0, 120),
    updatedAt: serverTimestamp(),
  })
}

/**
 * Invite by email.
 *
 * Their uid is unknown until they first sign in, so only the email list is
 * written now; `claimMembership` fills in the uid side on their first visit.
 */
export async function inviteMember(gid, email) {
  const clean = normaliseEmail(email)
  if (!clean || !clean.includes('@')) throw new Error('That does not look like an email address.')

  const snap = await getDoc(groupDoc(gid))
  if (!snap.exists()) throw new Error('That group no longer exists.')

  const group = snap.data()
  if ((group.memberEmails || []).includes(clean)) {
    throw new Error('They are already in this group.')
  }
  if ((group.memberEmails || []).length >= LIMITS.membersPerGroup) {
    throw new Error(`A group can hold at most ${LIMITS.membersPerGroup} people.`)
  }

  return updateDoc(groupDoc(gid), {
    memberEmails: arrayUnion(clean),
    [`invites.${clean.replace(/[.#$/[\]]/g, '_')}`]: { email: clean, invitedAt: Date.now() },
    updatedAt: serverTimestamp(),
  })
}

export async function removeMember(gid, { uid, email }) {
  const clean = normaliseEmail(email)
  const patch = { updatedAt: serverTimestamp() }
  if (clean) patch.memberEmails = arrayRemove(clean)

  await updateDoc(groupDoc(gid), patch)

  // Their uid entry goes separately: a single update cannot both arrayRemove and
  // delete a nested key reliably across SDK versions.
  if (uid) {
    const snap = await getDoc(groupDoc(gid))
    if (snap.exists()) {
      const members = { ...(snap.data().members || {}) }
      delete members[uid]
      await updateDoc(groupDoc(gid), { members, updatedAt: serverTimestamp() })
    }
  }
}

/**
 * Attach a uid to an email-only invitation, on first sign-in.
 * Idempotent, and a no-op for anyone already attached.
 */
export async function claimMembership(gid, user) {
  const email = normaliseEmail(user.email)
  const snap = await getDoc(groupDoc(gid))
  if (!snap.exists()) return false

  const group = snap.data()
  if (group.members?.[user.uid]) return false
  if (!(group.memberEmails || []).includes(email)) return false

  await updateDoc(groupDoc(gid), {
    [`members.${user.uid}`]: {
      role: ROLE.MEMBER,
      email,
      name: user.displayName || '',
      joinedAt: Date.now(),
    },
    updatedAt: serverTimestamp(),
  })
  return true
}

/**
 * Delete a group and every lead in it.
 *
 * Firestore does not cascade: deleting the parent would orphan the subcollection
 * where it stays billable and unreachable forever.
 */
export async function deleteGroup(gid) {
  const leads = await getDocs(leadsCol(gid))
  const chunks = []
  for (let i = 0; i < leads.docs.length; i += 400) chunks.push(leads.docs.slice(i, i + 400))

  for (const chunk of chunks) {
    const batch = writeBatch(db)
    chunk.forEach(d => batch.delete(d.ref))
    await batch.commit()
  }
  await deleteDoc(groupDoc(gid))
}

// ─── Shared leads ────────────────────────────────────────────────────────────

/**
 * A page of leads, newest first.
 *
 * Paginated rather than subscribed wholesale: a group with a thousand leads
 * would otherwise download every one of them on every visit, for everybody.
 */
export function subscribeLeadPage(gid, { pageSize = 25, after = null } = {}, onData, onError) {
  const clauses = [orderBy('createdAt', 'desc'), limit(pageSize)]
  if (after) clauses.splice(1, 0, startAfter(after))

  return onSnapshot(
    query(leadsCol(gid), ...clauses),
    (snap) => onData({
      leads: snapToArray(snap),
      cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
      exhausted: snap.docs.length < pageSize,
    }),
    onError,
  )
}

/** One further page, fetched once rather than subscribed. */
export async function fetchMoreLeads(gid, { pageSize = 25, after }) {
  const clauses = [orderBy('createdAt', 'desc')]
  if (after) clauses.push(startAfter(after))
  clauses.push(limit(pageSize))

  const snap = await getDocs(query(leadsCol(gid), ...clauses))
  return {
    leads: snapToArray(snap),
    cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
    exhausted: snap.docs.length < pageSize,
  }
}

export async function addSharedLead(gid, user, data) {
  const payload = clampFields({
    ...data,
    addedBy: user.uid,
    addedByName: user.displayName || '',
    addedByEmail: normaliseEmail(user.email),
    // The creator's own opinion starts here; everyone else defaults to active
    // simply by having no entry.
    states: {
      [user.uid]: {
        state: LEAD_STATE.ACTIVE,
        priority: data.priority || null,
        fitScore: data.fitScore || 0,
        archivedAt: null,
        updatedAt: Date.now(),
      },
    },
    schemaVersion: 3,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // priority and fitScore are personal, so they must not also sit at the top
  // level where they would read as the group's shared opinion.
  delete payload.priority
  delete payload.fitScore
  delete payload.state

  const ref = await addDoc(leadsCol(gid), payload)
  return ref.id
}

/** Shared facts only — never another member's state. */
export function updateSharedLead(gid, leadId, data) {
  const patch = clampFields({ ...data })
  delete patch.states
  delete patch.addedBy
  delete patch.priority
  delete patch.fitScore
  delete patch.state

  return updateDoc(leadDoc(gid, leadId), { ...patch, updatedAt: serverTimestamp() })
}

/**
 * Write my own opinion of a lead.
 *
 * Dot-path so only my key is touched: sending the whole `states` object would
 * overwrite everybody else's, which is precisely the failure a shared board
 * exists to avoid.
 */
export function setMyLeadState(gid, leadId, uid, patch) {
  const updates = { updatedAt: serverTimestamp() }
  for (const [key, value] of Object.entries(patch)) {
    updates[`states.${uid}.${key}`] = value
  }
  updates[`states.${uid}.updatedAt`] = Date.now()
  return updateDoc(leadDoc(gid, leadId), updates)
}

export const archiveLeadForMe = (gid, leadId, uid) =>
  setMyLeadState(gid, leadId, uid, { archivedAt: Date.now() })

export const restoreLeadForMe = (gid, leadId, uid) =>
  setMyLeadState(gid, leadId, uid, { archivedAt: null })

export const setMyLeadDecision = (gid, leadId, uid, state) =>
  setMyLeadState(gid, leadId, uid, { state })

/** Remove a lead from everyone's board. Group administrator only. */
export const destroySharedLead = (gid, leadId) => deleteDoc(leadDoc(gid, leadId))

/**
 * Convert a shared lead into a private application.
 *
 * Two documents in two different places, and they cannot be one atomic batch:
 * the application is in the user's private space and the lead is in the shared
 * group. The application is written first — if the second write fails the user
 * has their application and a lead that still reads active, which is a visible,
 * correctable state. The reverse order could mark a lead converted with no
 * application to show for it.
 */
export async function convertSharedLead(gid, leadId, user, extra = {}) {
  const snap = await getDoc(leadDoc(gid, leadId))
  if (!snap.exists()) throw new Error('That lead no longer exists.')

  const lead = snap.data()
  const applications = collection(db, 'users', user.uid, 'applications')

  const payload = clampFields({
    university: lead.university || '',
    labName: lead.labName || '',
    professor: lead.professor || '',
    department: lead.department || '',
    country: lead.country || '',
    researchArea: lead.researchArea || '',
    labUrl: lead.labUrl || '',
    fundingNote: lead.fundingNote || '',
    source: lead.source || '',
    notes: lead.notes || '',
    startDate: lead.startDate || null,
    deadline: lead.deadline || null,
    ...extra,
    stage: extra.stage || STAGE.IN_PROGRESS,
    fromLeadId: leadId,
    fromGroupId: gid,
    requiredDocs: extra.requiredDocs || [],
    submittedDocs: extra.submittedDocs || {},
    schemaVersion: 3,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  const ref = await addDoc(applications, payload)

  await setMyLeadState(gid, leadId, user.uid, {
    state: LEAD_STATE.CONVERTED,
    convertedToApp: ref.id,
  })

  return ref.id
}

// ─── Counters ────────────────────────────────────────────────────────────────

/**
 * Read a person's usage counters, creating them at zero on first look.
 * These back the per-account caps; the admin is never limited.
 */
export async function readCounts(uid) {
  const snap = await getDoc(countsDoc(uid))
  if (snap.exists()) return snap.data()
  const zero = { applications: 0, leadsCreated: 0, updatedAt: serverTimestamp() }
  await setDoc(countsDoc(uid), zero).catch(() => {})
  return zero
}

export function bumpCount(uid, field, by = 1) {
  return setDoc(
    countsDoc(uid),
    { [field]: increment(by), updatedAt: serverTimestamp() },
    { merge: true },
  )
}
