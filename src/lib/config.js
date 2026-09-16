// src/lib/config.js
// ─────────────────────────────────────────────────────────────────────────────
// Build environment configuration.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build-time flag for the screenshot and layout harnesses.
 *
 * When set, auth is replaced by a fixture user and Firestore by an in-memory
 * dataset, so every screen can be photographed without a real sign-in and
 * without touching live data. Never set in a production build.
 *
 * The administrator address deliberately does NOT live here. It has exactly one
 * home in the client — ADMIN_EMAIL in src/lib/access.js — which
 * scripts/check-access-parity.mjs pins against firestore.rules. A second copy
 * would be free to drift out of step with the rules that actually enforce it.
 */
export const UI_HARNESS = import.meta.env?.VITE_UI_HARNESS === '1'
