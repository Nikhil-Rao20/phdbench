// src/hooks/useToast.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Feedback for every action, including the ones that fail.
//
// Before this, not a single page wrapped a Firestore call in try/catch. A failed
// write closed the modal, stopped the spinner, and left the user believing their
// data was saved. For a tracker holding information you cannot reconstruct, a
// silent failure is the worst possible bug — so every mutation now routes
// through here and every outcome is stated.
//
// UX charter #12 (every state) and #13 (microinteractions confirm reality).
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Two contexts, deliberately.
 *
 * The API (push / dismiss / success / error …) must be referentially STABLE for
 * the life of the app, because consumers put it in `useEffect` dependency
 * arrays. The toast *list* changes constantly — every appearance and every
 * auto-dismiss.
 *
 * Holding both in one context value caused a real bug: the value was rebuilt on
 * every toast, which re-ran `DataProvider`'s subscription effect, tore down all
 * four Firestore listeners and set `loading` back to true — where it stuck,
 * because the effect that clears it watches `ready`, which never changed. Every
 * successful save therefore left the app spinning with the data hidden until a
 * manual reload.
 *
 * Splitting them means `useToast()` returns the same object forever, and only
 * the Toaster re-renders when the list changes.
 */
const ToastApiContext = createContext(null)
const ToastListContext = createContext([])

const DEFAULT_DURATION = 4000
const UNDO_DURATION = 8000 // Long enough to notice and react, short enough not to nag.

let idCounter = 0
const nextId = () => `toast-${++idCounter}`

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts(list => list.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback((toast) => {
    const id = toast.id || nextId()
    const duration = toast.duration ?? (toast.onUndo ? UNDO_DURATION : DEFAULT_DURATION)

    setToasts(list => {
      // Replacing by key stops a repeated action stacking six identical toasts.
      const withoutKey = toast.key ? list.filter(t => t.key !== toast.key) : list
      return [...withoutKey, { ...toast, id, duration, createdAt: Date.now() }]
    })

    // Errors persist until dismissed. A failure that disappears on its own is a
    // failure the user never learns about.
    if (duration !== Infinity && toast.tone !== 'error') {
      const timer = setTimeout(() => dismiss(id), duration)
      timers.current.set(id, timer)
    }

    return id
  }, [dismiss])

  // Clear every pending timer on unmount so a dismissed toast cannot fire into
  // an unmounted tree.
  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach(clearTimeout)
      pending.clear()
    }
  }, [])

  // `push` and `dismiss` are themselves stable, so this object is created once
  // and never again. Note the absence of `toasts` — including it here is exactly
  // what broke the app before.
  const api = useMemo(() => ({
    dismiss,
    /** Something worked. Short, quiet, self-dismissing. */
    success: (message, options = {}) => push({ tone: 'success', message, ...options }),
    /** Something failed. Stays until acknowledged, and offers a retry where one exists. */
    error: (message, options = {}) => push({ tone: 'error', message, ...options }),
    info: (message, options = {}) => push({ tone: 'info', message, ...options }),
    /** Neutral confirmation of a reversible action, with the reversal attached. */
    undo: (message, onUndo, options = {}) => push({ tone: 'undo', message, onUndo, ...options }),
    push,
  }), [push, dismiss])

  return (
    <ToastApiContext.Provider value={api}>
      <ToastListContext.Provider value={toasts}>
        {children}
      </ToastListContext.Provider>
    </ToastApiContext.Provider>
  )
}

/**
 * The toast API. Safe to place in a dependency array — this reference never
 * changes for the lifetime of the provider.
 */
export function useToast() {
  const ctx = useContext(ToastApiContext)
  if (!ctx) {
    throw new Error('useToast must be used inside a ToastProvider')
  }
  return ctx
}

/** The live toast list. For the Toaster only — it re-renders on every change. */
export function useToastList() {
  return useContext(ToastListContext)
}

/**
 * Wrap an async mutation so its failure can never be silent.
 *
 * Returns `{ ok, data, error }` rather than throwing, so callers can keep their
 * own UI state coherent (close the modal only on success, for instance) without
 * every call site needing its own try/catch.
 */
export function useMutation() {
  const toast = useToast()

  return useCallback(async (fn, {
    pending,
    success,
    failure = 'Could not save that.',
    onSuccess,
    retry,
  } = {}) => {
    let pendingId
    if (pending) {
      pendingId = toast.info(pending, { duration: Infinity, spinner: true })
    }

    try {
      const data = await fn()
      if (pendingId) toast.dismiss(pendingId)
      if (success) toast.success(typeof success === 'function' ? success(data) : success)
      onSuccess?.(data)
      return { ok: true, data, error: null }
    } catch (error) {
      if (pendingId) toast.dismiss(pendingId)
      toast.error(describeError(error, failure), {
        detail: error?.message,
        onRetry: retry,
      })
      return { ok: false, data: null, error }
    }
  }, [toast])
}

/**
 * Turn a Firebase error into something a person can act on.
 * "FirebaseError: Missing or insufficient permissions" tells the user nothing
 * about what to do next; these messages do.
 */
export function describeError(error, fallback = 'Something went wrong.') {
  const code = error?.code || ''

  if (code === 'permission-denied') {
    return 'Your account does not have access to this data. Check that you are signed in with the right Google account.'
  }
  if (code === 'unavailable' || code === 'failed-precondition') {
    return 'You appear to be offline. Your change is queued and will save when the connection returns.'
  }
  if (code === 'unauthenticated') {
    return 'Your session expired. Sign in again to continue.'
  }
  if (code === 'not-found') {
    return 'That item no longer exists — it may have been deleted in another tab.'
  }
  if (code === 'resource-exhausted') {
    return 'The database has hit its daily limit. It will reset at midnight Pacific time.'
  }
  if (code === 'deadline-exceeded') {
    return 'The request took too long. Check your connection and try again.'
  }
  if (error?.message?.includes('network') || error?.name === 'TypeError') {
    return 'Could not reach the server. Check your connection and try again.'
  }

  return fallback
}
