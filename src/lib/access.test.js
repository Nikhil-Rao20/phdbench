import { describe, it, expect } from 'vitest'
import {
  isAdmin, accessState, canUseApp, isMember, roleIn, isGroupAdmin,
  canEditLead, canDestroyLead, canInvite, canDeleteGroup,
  stateFor, personalView, isArchivedFor, appliedCount,
  withinLimit, ACCESS, ROLE, LIMITS, ADMIN_EMAIL,
} from './access'

const admin = { uid: 'u-admin', email: ADMIN_EMAIL }
const alice = { uid: 'u-alice', email: 'alice@example.com' }
const bob   = { uid: 'u-bob',   email: 'bob@example.com' }
const mallory = { uid: 'u-mallory', email: 'mallory@example.com' }

describe('isAdmin', () => {
  it('recognises the administrator regardless of case or padding', () => {
    expect(isAdmin(admin)).toBe(true)
    expect(isAdmin({ uid: 'x', email: ADMIN_EMAIL.toUpperCase() })).toBe(true)
    expect(isAdmin({ uid: 'x', email: `  ${ADMIN_EMAIL}  ` })).toBe(true)
  })

  it('refuses everybody else, including lookalikes', () => {
    expect(isAdmin(alice)).toBe(false)
    expect(isAdmin(null)).toBe(false)
    expect(isAdmin({ uid: 'x' })).toBe(false)
    // A near-miss address must not slip through a loose comparison.
    expect(isAdmin({ uid: 'x', email: `${ADMIN_EMAIL}.evil.com` })).toBe(false)
    expect(isAdmin({ uid: 'x', email: `evil${ADMIN_EMAIL}` })).toBe(false)
  })
})

describe('accessState', () => {
  it('lets the administrator in without a request record', () => {
    expect(accessState(admin, null)).toBe(ACCESS.APPROVED)
    expect(canUseApp(admin, null)).toBe(true)
  })

  it('reports the state the record carries', () => {
    expect(accessState(alice, { status: ACCESS.APPROVED })).toBe(ACCESS.APPROVED)
    expect(accessState(alice, { status: ACCESS.PENDING })).toBe(ACCESS.PENDING)
    expect(accessState(alice, { status: ACCESS.REJECTED })).toBe(ACCESS.REJECTED)
  })

  it('treats a missing or unrecognised record as no access', () => {
    expect(accessState(alice, null)).toBe(ACCESS.NONE)
    expect(accessState(alice, { status: 'something-else' })).toBe(ACCESS.NONE)
    expect(accessState(alice, {})).toBe(ACCESS.NONE)
    expect(canUseApp(alice, null)).toBe(false)
    expect(canUseApp(alice, { status: ACCESS.PENDING })).toBe(false)
  })

  it('refuses a signed-out visitor', () => {
    expect(accessState(null, { status: ACCESS.APPROVED })).toBe(ACCESS.NONE)
  })
})

describe('group membership', () => {
  const group = {
    createdBy: alice.uid,
    createdByEmail: alice.email,
    memberEmails: ['alice@example.com', 'bob@example.com'],
    members: {
      [alice.uid]: { role: ROLE.ADMIN, email: alice.email },
      [bob.uid]: { role: ROLE.MEMBER, email: bob.email },
    },
  }

  it('admits people on the email list', () => {
    expect(isMember(group, alice)).toBe(true)
    expect(isMember(group, bob)).toBe(true)
  })

  it('refuses everyone else', () => {
    expect(isMember(group, mallory)).toBe(false)
    expect(isMember(group, null)).toBe(false)
    expect(isMember(null, alice)).toBe(false)
  })

  it('is case-insensitive about addresses', () => {
    expect(isMember(group, { uid: 'x', email: 'ALICE@EXAMPLE.COM' })).toBe(true)
  })

  /**
   * The security property that matters: removing somebody from memberEmails
   * must actually revoke them. An earlier version also accepted a uid present
   * in the `members` map, so a removed member kept access through the stale
   * display entry.
   */
  it('revokes access when the email is removed, even if the members map is stale', () => {
    const removed = {
      ...group,
      memberEmails: ['alice@example.com'],
      members: group.members, // bob's uid deliberately left behind
    }
    expect(isMember(removed, bob)).toBe(false)
    expect(canEditLead(removed, bob)).toBe(false)
  })

  it('makes the creator the group administrator', () => {
    expect(isGroupAdmin(group, alice)).toBe(true)
    expect(isGroupAdmin(group, bob)).toBe(false)
    expect(roleIn(group, alice)).toBe(ROLE.ADMIN)
    expect(roleIn(group, bob)).toBe(ROLE.MEMBER)
    expect(roleIn(group, mallory)).toBeNull()
  })

  it('lets any member correct a shared fact', () => {
    expect(canEditLead(group, bob)).toBe(true)
    expect(canEditLead(group, mallory)).toBe(false)
  })

  it('reserves deleting for everyone, and inviting, to the group administrator', () => {
    expect(canDestroyLead(group, alice)).toBe(true)
    expect(canDestroyLead(group, bob)).toBe(false)
    expect(canInvite(group, alice)).toBe(true)
    expect(canInvite(group, bob)).toBe(false)
    expect(canDeleteGroup(group, alice)).toBe(true)
    expect(canDeleteGroup(group, bob)).toBe(false)
  })
})

describe('per-person lead state', () => {
  const lead = {
    university: 'ETH',
    states: {
      'u-alice': { state: 'converted', priority: 'dream', fitScore: 5, archivedAt: null },
      'u-bob':   { state: 'active', archivedAt: 1770000000000 },
    },
  }

  it('reads each person their own decision', () => {
    expect(stateFor(lead, 'u-alice').state).toBe('converted')
    expect(stateFor(lead, 'u-bob').state).toBe('active')
  })

  it('defaults somebody with no entry to active, unarchived', () => {
    const view = personalView(lead, 'u-carol')
    expect(view.state).toBe('active')
    expect(view.archivedAt).toBeNull()
    expect(view.fitScore).toBe(0)
  })

  it('keeps archiving personal', () => {
    expect(isArchivedFor(lead, 'u-bob')).toBe(true)
    expect(isArchivedFor(lead, 'u-alice')).toBe(false)
    // The crux of a shared board: one person tidying cannot hide a lead from
    // anyone else.
    expect(isArchivedFor(lead, 'u-carol')).toBe(false)
  })

  it('counts how many members applied, without reading their applications', () => {
    expect(appliedCount(lead)).toBe(1)
    expect(appliedCount({ states: {} })).toBe(0)
    expect(appliedCount({})).toBe(0)
    expect(appliedCount(null)).toBe(0)
  })
})

describe('limits', () => {
  it('caps ordinary accounts', () => {
    expect(withinLimit(alice, 'leads', 0)).toBe(true)
    expect(withinLimit(alice, 'leads', LIMITS.leads - 1)).toBe(true)
    expect(withinLimit(alice, 'leads', LIMITS.leads)).toBe(false)
    expect(withinLimit(alice, 'applications', LIMITS.applications)).toBe(false)
  })

  it('never limits the administrator', () => {
    expect(withinLimit(admin, 'leads', 999999)).toBe(true)
    expect(withinLimit(admin, 'applications', 999999)).toBe(true)
  })

  it('allows anything with no declared cap', () => {
    expect(withinLimit(alice, 'somethingElse', 10 ** 9)).toBe(true)
  })
})
