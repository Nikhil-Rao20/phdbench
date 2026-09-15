// src/hooks/useData.jsx
// ─────────────────────────────────────────────────────────────────────────────
// One live subscription per collection, shared by every screen.
//
// Previously each page fetched its own copy on mount and re-fetched the whole
// collection after every mutation. That was slow, burned read quota, and caused
// real bugs — the application detail panel read from state that had not been
// refreshed yet, so it showed pre-edit values immediately after a save.
//
// Here the data is subscribed once and pushed. A write updates every screen at
// the same instant, including other tabs, and Firestore's local cache means
// edits appear immediately even before the server confirms them.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import { useToast, describeError } from './useToast'
import {
  subscribeLeads, subscribeApplications, subscribeDocuments, subscribeProfile,
  ensureDefaultDocuments, activeOnly, archivedOnly,
} from '../lib/db'
import { UI_HARNESS } from '../lib/config'
import { harnessData } from '../lib/harnessData'

const DataContext = createContext(null)

const EMPTY = { leads: [], applications: [], documents: [], profile: null }

const ALL_PENDING = { leads: false, applications: false, documents: false, profile: false }
const ALL_READY   = { leads: true,  applications: true,  documents: true,  profile: true  }

export function DataProvider({ children }) {
  const { user } = useAuth()
  const toast = useToast()

  const [raw, setRaw] = useState(EMPTY)
  const [error, setError] = useState(null)

  // Each collection reports its own first load; the app is "ready" only when
  // all of them have. Rendering a dashboard from half-arrived data shows wrong
  // counts for a moment, which reads as data loss.
  const [ready, setReady] = useState(ALL_PENDING)

  // Held in a ref and kept out of the dependency array below.
  //
  // `toast` is stable now, but this effect owns four live Firestore
  // subscriptions: re-running it is expensive and was the mechanism of a bug
  // that left the app permanently spinning. A ref means no future change to the
  // toast module — or anything else read in here — can resurrect that.
  const toastRef = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  const uid = UI_HARNESS ? 'harness' : user?.uid || null

  useEffect(() => {
    if (UI_HARNESS) {
      setRaw(harnessData())
      setReady(ALL_READY)
      return undefined
    }

    if (!uid) {
      setRaw(EMPTY)
      setReady(ALL_READY)
      return undefined
    }

    // Re-subscribing means the data is genuinely unknown again, so readiness
    // resets with it. Previously it did not, which is why `loading` could be set
    // true and then never cleared.
    setReady(ALL_PENDING)
    setError(null)

    const markReady = (key) => setReady(r => (r[key] ? r : { ...r, [key]: true }))

    const onError = (key) => (err) => {
      setError(err)
      // Mark ready even on failure. An error is a finished outcome; leaving the
      // key pending would hang the whole app behind a spinner forever.
      markReady(key)
      toastRef.current.error(describeError(err, `Could not load your ${key}.`), { key: `load-${key}` })
    }

    const unsubs = [
      subscribeLeads(uid, (data) => { setRaw(s => ({ ...s, leads: data })); markReady('leads') }, onError('leads')),
      subscribeApplications(uid, (data) => { setRaw(s => ({ ...s, applications: data })); markReady('applications') }, onError('applications')),
      subscribeDocuments(uid, (data) => { setRaw(s => ({ ...s, documents: data })); markReady('documents') }, onError('documents')),
      subscribeProfile(uid, (data) => { setRaw(s => ({ ...s, profile: data })); markReady('profile') }, onError('profile')),
    ]

    return () => unsubs.forEach(fn => fn?.())
  }, [uid])

  // Derived, not stored. A separate `loading` flag could fall out of step with
  // the thing it describes — and did.
  const loading = !Object.values(ready).every(Boolean)

  // Seed the document checklist the first time an account is used. This is the
  // call the previous version was missing entirely, which left new accounts with
  // an empty checklist and no obvious way to fill it.
  // Guarded by a ref, not only by the document count.
  //
  // `ensureDefaultDocuments` reads then writes, so two overlapping calls would
  // both see an empty collection and both commit a full set — twelve documents
  // become twenty-four. The subscription has not delivered yet at first run, so
  // the count check alone cannot prevent that; React StrictMode double-invoking
  // effects in development is enough to trigger it.
  const seedingRef = useRef(false)

  useEffect(() => {
    if (UI_HARNESS || !user || !ready.documents) return
    if (raw.documents.length > 0 || seedingRef.current) return

    seedingRef.current = true
    ensureDefaultDocuments(user.uid).catch(err => {
      seedingRef.current = false // Let a genuine failure be retried.
      toastRef.current.error(describeError(err, 'Could not set up your document checklist.'))
    })
  }, [user, ready.documents, raw.documents.length])

  const value = useMemo(() => ({
    loading,
    error,

    // Active records — what almost every screen wants.
    leads: activeOnly(raw.leads),
    applications: activeOnly(raw.applications),
    documents: raw.documents,
    profile: raw.profile,

    // Archived records, for the Archive view and for restore.
    archivedLeads: archivedOnly(raw.leads),
    archivedApplications: archivedOnly(raw.applications),

    // Unfiltered, for export and for counts that must include everything.
    allLeads: raw.leads,
    allApplications: raw.applications,

    /** Look-ups by id, so a detail view never holds its own stale copy. */
    applicationById: (id) => raw.applications.find(a => a.id === id) || null,
    leadById: (id) => raw.leads.find(l => l.id === id) || null,
    documentById: (id) => raw.documents.find(d => d.id === id) || null,
  }), [raw, loading, error])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside a DataProvider')
  return ctx
}

/**
 * The uid every mutation needs, with the harness accounted for.
 * Keeps `user?.uid` out of every call site.
 */
export function useUid() {
  const { user } = useAuth()
  return UI_HARNESS ? 'harness-user' : user?.uid || null
}

/**
 * Copy-to-clipboard with the confirmation the charter asks for (#13).
 * Returns a `copied` flag callers can render as a "Copied" pill.
 */
export function useCopy(resetAfter = 1800) {
  const [copied, setCopied] = useState(null)

  const copy = useCallback(async (text, key = 'default') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(c => (c === key ? null : c)), resetAfter)
      return true
    } catch {
      return false
    }
  }, [resetAfter])

  return { copied, copy }
}
