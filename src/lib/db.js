// src/lib/db.js  — all Firestore operations for PhDBench
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, serverTimestamp, writeBatch
} from 'firebase/firestore'
import { db } from './firebase'

// ── helpers ──────────────────────────────────────────────────────
const userCol = (uid, col) => collection(db, 'users', uid, col)
const userDoc = (uid, col, id) => doc(db, 'users', uid, col, id)

// ── LEADS ────────────────────────────────────────────────────────
export async function getLeads(uid) {
  const q = query(userCol(uid, 'leads'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addLead(uid, data) {
  return addDoc(userCol(uid, 'leads'), {
    ...data,
    status: 'lead',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateLead(uid, id, data) {
  return updateDoc(userDoc(uid, 'leads', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteLead(uid, id) {
  return deleteDoc(userDoc(uid, 'leads', id))
}

// ── APPLICATIONS ─────────────────────────────────────────────────
export async function getApplications(uid) {
  const q = query(userCol(uid, 'applications'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addApplication(uid, data) {
  return addDoc(userCol(uid, 'applications'), {
    ...data,
    requiredDocs: data.requiredDocs || [], // Which docs are required for this app
    submittedDocs: data.submittedDocs || data.docs || {}, // Which docs have been submitted
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateApplication(uid, id, data) {
  return updateDoc(userDoc(uid, 'applications', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteApplication(uid, id) {
  return deleteDoc(userDoc(uid, 'applications', id))
}

// Convert a lead into an application (atomic)
export async function promoteLeadToApplication(uid, leadId, extraData) {
  const leadSnap = await getDoc(userDoc(uid, 'leads', leadId))
  if (!leadSnap.exists()) throw new Error('Lead not found')
  const leadData = leadSnap.data()

  const batch = writeBatch(db)
  // add application
  const appRef = doc(userCol(uid, 'applications'))
  batch.set(appRef, {
    ...leadData,
    ...extraData,
    fromLeadId: leadId,
    status: 'applied',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  // mark lead as converted
  batch.update(userDoc(uid, 'leads', leadId), {
    convertedToApp: appRef.id,
    status: 'converted',
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
  return appRef.id
}

// ── FOLLOW-UPS ───────────────────────────────────────────────────
export async function getFollowups(uid, appId) {
  const q = query(
    collection(db, 'users', uid, 'applications', appId, 'followups'),
    orderBy('date', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addFollowup(uid, appId, data) {
  return addDoc(
    collection(db, 'users', uid, 'applications', appId, 'followups'),
    { ...data, createdAt: serverTimestamp() }
  )
}

export async function deleteFollowup(uid, appId, fid) {
  return deleteDoc(
    doc(db, 'users', uid, 'applications', appId, 'followups', fid)
  )
}

// ── ACTIVITY LOG ─────────────────────────────────────────────────
export async function getActivityLog(uid, appId) {
  const q = query(
    collection(db, 'users', uid, 'applications', appId, 'activity'),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addActivityEntry(uid, appId, note) {
  return addDoc(
    collection(db, 'users', uid, 'applications', appId, 'activity'),
    { note, createdAt: serverTimestamp() }
  )
}

// ── DOCUMENTS (user-defined) ──────────────────────────────────────
export async function getDocuments(uid) {
  const q = query(userCol(uid, 'documents'), orderBy('order', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addDocument(uid, data) {
  const docs = await getDocuments(uid)
  return addDoc(userCol(uid, 'documents'), {
    ...data,
    order: docs.length,
    createdAt: serverTimestamp(),
  })
}

export async function updateDocument(uid, id, data) {
  return updateDoc(userDoc(uid, 'documents', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteDocument(uid, id) {
  return deleteDoc(userDoc(uid, 'documents', id))
}

// Initialize default documents for new user
export async function initializeDefaultDocuments(uid) {
  const existing = await getDocuments(uid)
  if (existing.length > 0) return // Already initialized
  
  const defaults = [
    { name: 'Statement of Purpose (SOP)' },
    { name: 'CV / Resume' },
    { name: 'Letter of Rec — 1' },
    { name: 'Letter of Rec — 2' },
    { name: 'Letter of Rec — 3' },
    { name: 'Transcripts' },
    { name: 'GRE scores' },
    { name: 'Writing sample' },
    { name: 'Diversity statement' },
  ]
  
  for (let i = 0; i < defaults.length; i++) {
    await addDocument(uid, { name: defaults[i].name, order: i })
  }
}
