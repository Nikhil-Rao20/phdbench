// Tests for the lead → shared-lead transform.
//
// The fixtures below are shaped from the owner's real export (22 leads: 14
// active, 7 converted, 1 ruled out, 6 archived, deadlines as bare strings) so
// the cases exercised here are the ones that will actually run.

import { describe, it, expect } from 'vitest'
import { toSharedLead } from './migrateToGroups'

const user = { uid: 'u-nikhil', displayName: 'Nikhil Rao', email: 'Nikhil01446@Gmail.com' }

const activeLead = {
  id: 'lead-eth',
  university: 'ETH Zürich',
  labName: 'Biomedical Image Computing',
  professor: 'Prof. Ender Konukoglu',
  country: 'CH',
  state: 'active',
  priority: 'dream',
  fitScore: 5,
  deadline: '2026-12-15',
  notes: 'Close to my thesis.',
  schemaVersion: 2,
  createdAt: { seconds: 1775239570, nanoseconds: 0 },
}

const convertedLead = {
  id: 'lead-mit',
  university: 'MIT',
  state: 'converted',
  convertedToApp: 'app-123',
  priority: 'dream',
  fitScore: 5,
}

const archivedLead = { id: 'lead-old', university: 'KTH', state: 'expired', archivedAt: 1770000000000 }

describe('toSharedLead', () => {
  it('keeps the shared facts', () => {
    const out = toSharedLead(activeLead, user)
    expect(out.university).toBe('ETH Zürich')
    expect(out.labName).toBe('Biomedical Image Computing')
    expect(out.professor).toBe('Prof. Ender Konukoglu')
    expect(out.country).toBe('CH')
    expect(out.notes).toBe('Close to my thesis.')
    // A bare legacy date string survives untouched — reshaping it here would
    // silently reinterpret a deadline.
    expect(out.deadline).toBe('2026-12-15')
  })

  it('moves personal judgment off the top level into the owner\'s own entry', () => {
    const out = toSharedLead(activeLead, user)

    // Left at the top level, these would read as the group's shared opinion.
    expect(out.state).toBeUndefined()
    expect(out.priority).toBeUndefined()
    expect(out.fitScore).toBeUndefined()

    expect(out.states[user.uid].state).toBe('active')
    expect(out.states[user.uid].priority).toBe('dream')
    expect(out.states[user.uid].fitScore).toBe(5)
  })

  it('keeps a converted lead converted for the owner only', () => {
    const out = toSharedLead(convertedLead, user)
    expect(out.states[user.uid].state).toBe('converted')
    expect(out.states[user.uid].convertedToApp).toBe('app-123')

    // Nobody else has an entry, so the position reads as active on their board —
    // which is exactly what makes it newly visible to teammates.
    expect(Object.keys(out.states)).toEqual([user.uid])
  })

  it('treats a lead with an application but no state as converted', () => {
    const out = toSharedLead({ id: 'x', university: 'CMU', convertedToApp: 'app-9' }, user)
    expect(out.states[user.uid].state).toBe('converted')
  })

  it('defaults a stateless lead to active', () => {
    const out = toSharedLead({ id: 'y', university: 'NUS' }, user)
    expect(out.states[user.uid].state).toBe('active')
  })

  it('keeps an archived lead archived for the owner and nobody else', () => {
    const out = toSharedLead(archivedLead, user)
    expect(out.states[user.uid].archivedAt).toBe(1770000000000)
    // Not at the top level, or it would vanish from everyone's board.
    expect(out.archivedAt).toBeUndefined()
  })

  it('records authorship with a normalised email', () => {
    const out = toSharedLead(activeLead, user)
    expect(out.addedBy).toBe('u-nikhil')
    expect(out.addedByName).toBe('Nikhil Rao')
    expect(out.addedByEmail).toBe('nikhil01446@gmail.com')
  })

  it('records provenance so a second run skips it', () => {
    const out = toSharedLead(activeLead, user)
    expect(out.migratedFromLeadId).toBe('lead-eth')
    expect(out.schemaVersion).toBe(3)
  })

  it('drops the private document id rather than carrying it as a field', () => {
    const out = toSharedLead(activeLead, user)
    expect(out.id).toBeUndefined()
  })

  it('never invents a state for anyone but the migrating user', () => {
    const out = toSharedLead(activeLead, user)
    expect(Object.keys(out.states)).toHaveLength(1)
  })
})
