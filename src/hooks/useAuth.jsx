// src/hooks/useAuth.jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  onAuthStateChanged, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut,
} from 'firebase/auth'
import { auth, provider } from '../lib/firebase'
import { UI_HARNESS, isOwner } from '../lib/config'
import { harnessUser } from '../lib/harnessData'

const AuthContext = createContext(null)

/**
 * Popup sign-in is blocked or silently broken in a number of places people
 * actually open links from — the in-app browsers inside LinkedIn, Instagram and
 * Gmail among them. Since leads get saved from a phone straight off LinkedIn,
 * that is a real path, so we fall back to a full-page redirect rather than
 * leaving the user tapping a button that does nothing.
 */
function shouldUseRedirect(error) {
  return [
    'auth/popup-blocked',
    'auth/popup-closed-by-user',
    'auth/cancelled-popup-request',
    'auth/operation-not-supported-in-this-environment',
  ].includes(error?.code)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(UI_HARNESS ? harnessUser : undefined) // undefined = still resolving
  const [error, setError] = useState(null)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    if (UI_HARNESS) return undefined

    // Collect the result of a redirect sign-in, if that is how we got here.
    getRedirectResult(auth).catch(e => {
      if (e?.code !== 'auth/no-auth-event') setError(e)
    })

    return onAuthStateChanged(
      auth,
      u => { setUser(u ?? null); setSigningIn(false) },
      e => { setError(e); setUser(null); setSigningIn(false) },
    )
  }, [])

  const login = async () => {
    if (UI_HARNESS) return
    setError(null)
    setSigningIn(true)
    try {
      await signInWithPopup(auth, provider)
    } catch (e) {
      if (shouldUseRedirect(e)) {
        try {
          await signInWithRedirect(auth, provider)
          return
        } catch (redirectError) {
          setError(redirectError)
        }
      } else if (e?.code !== 'auth/cancelled-popup-request') {
        setError(e)
      }
      setSigningIn(false)
    }
  }

  const logout = async () => {
    if (UI_HARNESS) return
    setError(null)
    try {
      await signOut(auth)
    } catch (e) {
      setError(e)
    }
  }

  const value = useMemo(() => ({
    user,
    login,
    logout,
    error,
    signingIn,
    /** Signed in, but not the account this tool belongs to. */
    isAuthorized: UI_HARNESS ? true : Boolean(user && isOwner(user)),
    isImpostor: Boolean(user && !UI_HARNESS && !isOwner(user)),
  }), [user, error, signingIn])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
