// src/lib/access.js
// ─────────────────────────────────────────────────────────────────────────────
// Authorization, as pure functions.
//
// Every rule expressed here has a counterpart in `firestore.rules`, which is the
// real enforcement — this module cannot secure anything on its own, because it
// runs on the user's own machine where they could simply edit it. What it does
// is let the UI make the *same* decisions the server will, so the interface
// never offers an action that is about to be refused, and let those decisions be
// tested exhaustively without a Firestore emulator.
//
// The pairing is deliberate and fragile in one direction: changing a rule here
// without changing `firestore.rules` produces a UI that lies. `scripts/
// check_access_parity.mjs` fails the build if the constants drift apart.
// ─────────────────────────────────────────────────────────────────────────────

/** The single administrator. Mirrors `adminEmail()` in firestore.rules. */
export const ADMIN_EMAIL = 'nikhil01446@gmail.com'

/**
 * Per-account ceilings. The admin is exempt from all of them.
 *
 * These exist because access is free and approval is manual: they bound what a
 * single approved account can cost, so one person cannot exhaust the project's
 * free quota for everybody else.
 */
export const LIMITS = {
  leads: 500,
  applications: 500,
  groups: 10,
  membersPerGroup: 25,
}

export const ACCESS = {
  /** Signed in, never asked for access. */
  NONE: 'none',
  /** Asked, awaiting the administrator. */
  PENDING: 'pending',
  /** Refused. */
  REJECTED: 'rejected',
  /** Full use of the app. */
  APPROVED: 'approved',
}

export const ROLE = {
  /** Created the group. Can rename it, invite, remove members, delete it. */
  ADMIN: 'admin',
  /** Can read and add leads, and edit shared facts. */
  MEMBER: 'member',
}

const normalise = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '')

/**
 * The administrator.
 *
 * Deliberately the only privilege that is not stored in the database. Nothing a
 * user can do inside the app — no document they can write, no group they can
 * create — can make them an administrator, because the answer comes from a
 * constant compiled into the rules rather than from data they might influence.
 */
export function isAdmin(user) {
  if (!user?.email) return false
  return normalise(user.email) === normalise(ADMIN_EMAIL)
}

/**
 * What a signed-in user is allowed to do, from their access-request record.
 * An absent record means they have never asked.
 */
export function accessState(user, request) {
  if (!user) return ACCESS.NONE
  if (isAdmin(user)) return ACCESS.APPROVED
  if (!request) return ACCESS.NONE
  if (request.status === ACCESS.APPROVED) return ACCESS.APPROVED
  if (request.status === ACCESS.REJECTED) return ACCESS.REJECTED
  if (request.status === ACCESS.PENDING) return ACCESS.PENDING
  return ACCESS.NONE
}

export const canUseApp = (user, request) => accessState(user, request) === ACCESS.APPROVED

// ─── Groups ──────────────────────────────────────────────────────────────────

/**
 * Membership is keyed by uid for the rules to check cheaply, and mirrored as a
 * lowercased email list so somebody can be invited before they have ever signed
 * in — at which point no uid for them exists yet.
 */
export function isMember(group, user) {
  if (!group || !user) return false
  // `memberEmails` alone decides access, matching firestore.rules exactly.
  // Accepting the `members` map as an alternative made removal ineffective:
  // the email came out of the list while the uid stayed in the map, and the
  // map alone still let them in.
  const email = normalise(user.email)
  return Boolean(email) && (group.memberEmails || []).map(normalise).includes(email)
}

export function roleIn(group, user) {
  if (!group || !user) return null
  if (group.createdBy === user.uid) return ROLE.ADMIN
  return group.members?.[user.uid]?.role || (isMember(group, user) ? ROLE.MEMBER : null)
}

export const isGroupAdmin = (group, user) => roleIn(group, user) === ROLE.ADMIN

/** Anyone in the group may correct a shared fact — whoever spots the error. */
export const canEditLead = (group, user) => isMember(group, user)

/**
 * Removing a lead for *everyone* is the group admin's call alone.
 * Members archive it from their own board instead, which touches only their own
 * key and leaves everyone else's view intact.
 */
export const canDestroyLead = (group, user) => isGroupAdmin(group, user)

export const canInvite = (group, user) => isGroupAdmin(group, user)

export const canRenameGroup = (group, user) => isGroupAdmin(group, user)

export const canDeleteGroup = (group, user) =>
  Boolean(group) && Boolean(user) && group.createdBy === user.uid

// ─── Per-person lead state ───────────────────────────────────────────────────

/**
 * A lead's shared facts are one document; what each person has decided about it
 * lives under their own uid inside that document.
 *
 * This is the whole reason a shared board works: your friend converting a lead
 * writes only `states.<his uid>`, so your board is untouched. A single shared
 * status would mean his decision silently reclassified the lead for you.
 */
export function stateFor(lead, uid) {
  return lead?.states?.[uid] || null
}

export const LEAD_PERSONAL_DEFAULT = {
  state: 'active',
  priority: null,
  fitScore: 0,
  archivedAt: null,
}

export function personalView(lead, uid) {
  const mine = stateFor(lead, uid)
  return { ...LEAD_PERSONAL_DEFAULT, ...(mine || {}) }
}

/** Archived by *this* person — never by anyone else's action. */
export const isArchivedFor = (lead, uid) => Boolean(personalView(lead, uid).archivedAt)

/**
 * How many members have converted this lead into an application.
 * Counted from the shared state map, so it needs no access to anyone's private
 * application list.
 */
export function appliedCount(lead) {
  const states = lead?.states || {}
  return Object.values(states).filter(s => s?.state === 'converted').length
}

// ─── Limits ──────────────────────────────────────────────────────────────────

/**
 * Whether one more record may be created.
 * `count` is the caller's current total; the admin is never limited.
 */
export function withinLimit(user, kind, count) {
  if (isAdmin(user)) return true
  const cap = LIMITS[kind]
  if (!cap) return true
  return count < cap
}

export function limitMessage(kind, count) {
  const cap = LIMITS[kind]
  if (!cap) return null
  const remaining = cap - count
  if (remaining > 25) return null
  if (remaining <= 0) {
    return `You have reached the limit of ${cap} ${kind}. Archive some you no longer need, or ask for the cap to be raised.`
  }
  return `${remaining} of your ${cap} ${kind} remaining.`
}
