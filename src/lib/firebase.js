// src/lib/firebase.js
// ─────────────────────────────────────────────────────────────────────────────
// Firebase initialisation.
//
// The config below is not a secret. Firebase web config identifies the project;
// it does not authorise anything. All access control lives in `firestore.rules`
// at the repo root, which is the file that actually decides who may read and
// write. Publish those rules from the Firebase console or the CLI — see
// docs/FIREBASE.md.
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { UI_HARNESS } from './config'

const firebaseConfig = {
  apiKey: "AIzaSyDiUw-VOm6izK6mZuxEgE3LNgYlDvHuTJY",
  authDomain: "phdbench.firebaseapp.com",
  projectId: "phdbench",
  storageBucket: "phdbench.firebasestorage.app",
  messagingSenderId: "133283058963",
  appId: "1:133283058963:web:4ef1cfa66dd0d72f06f6e6",
  measurementId: "G-ZJ7GMM8D25",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)

/**
 * Offline-first Firestore.
 *
 * `persistentLocalCache` keeps a full local copy, so the app opens instantly,
 * reads served from cache cost nothing against the daily quota, and writes made
 * without a connection queue and sync when it returns. `persistentMultipleTabManager`
 * keeps that cache coherent when the app is open in more than one tab — without
 * it, a second tab silently fails to acquire the cache lock.
 *
 * In harness mode Firestore is never contacted, but the instance still has to
 * exist for imports to resolve.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

export const provider = new GoogleAuthProvider()

// Ask for an account chooser every time rather than silently reusing whichever
// Google session the browser happens to hold. On a shared or multi-account
// machine, silent reuse is how you end up staring at an empty app wondering
// where your data went.
provider.setCustomParameters({ prompt: 'select_account' })

// Survive a refresh and a closed tab. Without this the user re-authenticates
// far more often than they should.
if (!UI_HARNESS) {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // Private browsing and some embedded webviews block persistent storage.
    // Session-scoped auth still works, so this is not worth surfacing.
  })
}
