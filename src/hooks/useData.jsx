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

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
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

export function DataProvider({ children }) {
  const { user } = useAuth()
  const toast = useToast()

  const [raw, setRaw] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Each collection reports its own first load; the app is "ready" only when
  // all of them have. Rendering a dashboard from half-arrived data shows wrong
  // counts for a moment, which reads as data loss.
  const [ready, setReady] = useState({ leads: false, applications: false, documents: false, profile: false })

  useEffect(() => {
    if (UI_HARNESS) {
      setRaw(harnessData())
      setReady({ leads: true, applications: true, documents: true, profile: true })
      setLoading(false)
      return undefined
    }

    if (!user) {
      setRaw(EMPTY)
      setLoading(false)
      return undefined
    }

    setLoading(true)
    setError(null)

    const markReady = (key) => setReady(r => (r[key] ? r : { ...r, [key]: true }))

    const onError = (key) => (err) => {
      setError(err)
      markReady(key)
      toast.error(describeError(err, `Could not load your ${key}.`), { key: `load-${key}` })
    }

    const unsubs = [
      subscribeLeads(user.uid, (data) => { setRaw(s => ({ ...s, leads: data })); markReady('leads') }, onError('leads')),
      subscribeApplications(user.uid, (data) => { setRaw(s => ({ ...s, applications: data })); markReady('applications') }, onError('applications')),
      subscribeDocuments(user.uid, (data) => { setRaw(s => ({ ...s, documents: data })); markReady('documents') }, onError('documents')),
      subscribeProfile(user.uid, (data) => { setRaw(s => ({ ...s, profile: data })); markReady('profile') }, onError('profile')),
    ]

    return () => unsubs.forEach(fn => fn?.())
  }, [user, toast])

  useEffect(() => {
    if (Object.values(ready).every(Boolean)) setLoading(false)
  }, [ready])

  // Seed the document checklist the first time an account is used. This is the
  // call the previous version was missing entirely, which left new accounts with
  // an empty checklist and no obvious way to fill it.
  useEffect(() => {
    if (UI_HARNESS || !user || !ready.documents) return
    if (raw.documents.length > 0) return
    ensureDefaultDocuments(user.uid).catch(err => {
      toast.error(describeError(err, 'Could not set up your document checklist.'))
    })
  }, [user, ready.documents, raw.documents.length, toast])

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
