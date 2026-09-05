// src/lib/config.js
// ─────────────────────────────────────────────────────────────────────────────
// Ownership and environment configuration.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The account that owns this data. Confirmed by the owner, 2026-09-05.
 *
 * PhDBench is a single-owner tool: only this Google account may sign in and read
 * or write. The same address must appear in `firestore.rules` — that file is the
 * real enforcement, and the two must never drift apart.
 *
 * A mismatch here is only an inconvenience: signing in with another account
 * shows a screen naming the address used and pointing at this file. A mismatch
 * in `firestore.rules` is a genuine lockout, fixable only from the Firebase
 * console. Change both together.
 */
export const OWNER_EMAIL = 'nikhil01446@gmail.com'

/** Normalised comparison — Google addresses are case-insensitive. */
export function isOwner(user) {
  if (!user?.email) return false
  return user.email.trim().toLowerCase() === OWNER_EMAIL.trim().toLowerCase()
}

/**
 * Fixture mode for the screenshot harness.
 *
 * When enabled, auth returns a fixture user and the data layer serves an
 * in-memory dataset instead of Firestore. This lets the verification runner
 * render every authenticated screen without performing a real Google sign-in,
 * and without touching live data. It is compiled out of production builds
 * because the flag is a build-time environment variable.
 */
export const UI_HARNESS = import.meta.env?.VITE_UI_HARNESS === '1'
