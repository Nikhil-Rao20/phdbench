// src/hooks/useAccess.jsx
// Who is allowed in, and what they are waiting for.

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import { subscribeMyAccessRequest } from '../lib/groupsDb'
import { accessState, isAdmin, ACCESS } from '../lib/access'
import { UI_HARNESS } from '../lib/config'

const AccessContext = createContext(null)

/** Fixture submission, for photographing the pending and refused screens. */
const HARNESS_PENDING = {
  status: ACCESS.PENDING,
  name: 'Priya Sharma',
  email: 'priya@example.com',
  location: 'Bengaluru, India',
  position: 'masters',
  applyingFor: 'Computer Vision PhD, Fall 2027',
  applyingTo: 'foreign',
  link: 'https://scholar.google.com/citations?user=example',
  heardFrom: 'A friend',
}

export function AccessProvider({ children }) {
  const { user } = useAuth()
  const [request, setRequest] = useState(undefined) // undefined = still loading
  const [error, setError] = useState(null)

  useEffect(() => {
    if (UI_HARNESS) {
      // The harness can be pointed at any access state so the request, pending
      // and refused screens can be photographed without a real refused account.
      const forced = new URLSearchParams(window.location.search).get('harness')
      if (forced === 'none') setRequest(null)
      else if (forced === 'pending') setRequest(HARNESS_PENDING)
      else if (forced === 'rejected') setRequest({ ...HARNESS_PENDING, status: ACCESS.REJECTED, decisionNote: 'Not taking new users this cycle.' })
      else setRequest({ status: ACCESS.APPROVED })
      return undefined
    }
    if (!user) { setRequest(null); return undefined }

    // The administrator is never gated, and must not be: if the queue itself
    // were unreadable, the one person who can fix it would be locked out.
    if (isAdmin(user)) { setRequest({ status: ACCESS.APPROVED }); return undefined }

    setRequest(undefined)
    return subscribeMyAccessRequest(
      user.uid,
      (doc) => { setRequest(doc); setError(null) },
      (err) => {
        // A refused read means the rules are stricter than this build expects.
        // Treat it as "not approved" rather than crashing into a blank screen.
        setError(err)
        setRequest(null)
      },
    )
  }, [user])

  const value = useMemo(() => ({
    request,
    error,
    loading: request === undefined,
    state: request === undefined ? undefined : accessState(user, request),
    // In the harness the fixture user administers, so the access queue can be
    // photographed without putting a real address in the fixtures.
    admin: UI_HARNESS ? true : isAdmin(user),
  }), [request, error, user])

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}

export function useAccess() {
  const ctx = useContext(AccessContext)
  if (!ctx) throw new Error('useAccess must be used inside an AccessProvider')
  return ctx
}
