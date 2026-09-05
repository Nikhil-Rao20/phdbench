// src/lib/config.js
// ─────────────────────────────────────────────────────────────────────────────
// Ownership and environment configuration.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️  CONFIRM THIS ADDRESS.
 *
 * PhDBench is a single-owner tool: only this Google account may sign in and read
 * or write the data. This value must match the account you actually sign in with.
 *
 * It was inferred from the git history of this repository
 * (`Nikhil-Rao20 <nikhilproffesion@gmail.com>`), which is an educated guess, not
 * a verified fact — the Claude session reported a different address
 * (nikhil01446@gmail.com), so the two disagree.
 *
 * If this is wrong you are NOT locked out: signing in with a different account
 * shows a screen naming the address you used and pointing at this file. Change
 * the value here, and the same address in `firestore.rules`, and you are in.
 *
 * The real enforcement is in `firestore.rules`. This constant only controls the
 * UI, so a mismatch here is an inconvenience; a mismatch there is a lockout.
 * Publish the rules only once you have confirmed the address.
 */
export const OWNER_EMAIL = 'nikhilproffesion@gmail.com'

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
