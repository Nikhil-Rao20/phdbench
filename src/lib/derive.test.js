import { describe, it, expect } from 'vitest'
import {
  docsProgress, readiness, responseRate, emailReplyRate,
  submittedApplications, knownEntities, findDuplicate,
} from './derive'
import { STAGE } from './model'

const documents = [
  { id: 'd1', name: 'SOP' },
  { id: 'd2', name: 'CV' },
  { id: 'd3', name: 'Transcripts' },
]

describe('docsProgress', () => {
  it('counts ticked documents against required ones', () => {
    const app = { requiredDocs: ['d1', 'd2'], submittedDocs: { d1: true } }
    expect(docsProgress(app, documents)).toMatchObject({ done: 1, total: 2 })
  })

  // The corruption bug: a document type gets deleted in Settings, but every
  // application still carries its id in requiredDocs. The old code divided by
  // requiredDocs.length, so the denominator counted a document that no longer
  // existed and the bar could never reach 100%.
  it('ignores required ids whose document type has been deleted', () => {
    const app = { requiredDocs: ['d1', 'd2', 'deleted-doc'], submittedDocs: { d1: true, d2: true } }
    const { done, total } = docsProgress(app, documents)
    expect(total).toBe(2)
    expect(done).toBe(2)
    // Complete, rather than stuck at 2/3 forever.
    expect(done).toBe(total)
  })

  // The other half of the same bug: unchecking a required document left its
  // submitted flag behind, so the form could report "5 / 3 submitted".
  it('does not count submitted documents that are no longer required', () => {
    const app = { requiredDocs: ['d1'], submittedDocs: { d1: true, d2: true, d3: true } }
    const { done, total } = docsProgress(app, documents)
    expect(done).toBe(1)
    expect(total).toBe(1)
    expect(done).toBeLessThanOrEqual(total)
  })

  it('reads the pre-v2 `docs` field so legacy records still show progress', () => {
    const app = { requiredDocs: ['d1', 'd2'], docs: { d1: true } }
    expect(docsProgress(app, documents)).toMatchObject({ done: 1, total: 2 })
  })

  it('handles an application with nothing set', () => {
    expect(docsProgress({}, documents)).toMatchObject({ done: 0, total: 0 })
    expect(docsProgress(null, documents)).toMatchObject({ done: 0, total: 0 })
  })
})

describe('readiness', () => {
  it('gives credit for groundwork, not only for documents', () => {
    // Charter #5: a bar reading 0% before you have done anything wrong is both
    // discouraging and false. This application has real work in it.
    const app = {
      university: 'MIT', professor: 'Prof. X',
      deadline: '2027-01-01', whyThisLab: 'reasons', sopAngle: 'angle',
      requiredDocs: ['d1', 'd2'], submittedDocs: {},
    }
    const r = readiness(app, documents)
    expect(r.percent).toBeGreaterThan(0)
    expect(r.percent).toBeLessThan(100)
  })

  it('reaches 100 only when everything measurable is done', () => {
    const app = {
      university: 'MIT', professor: 'Prof. X',
      deadline: '2027-01-01', whyThisLab: 'reasons', sopAngle: 'angle',
      requiredDocs: ['d1'], submittedDocs: { d1: true },
      recommenders: [{ recommenderId: 'r1', status: 'submitted' }],
      fee: { amount: 90, currency: 'USD', paid: true },
    }
    expect(readiness(app, documents).percent).toBe(100)
  })

  it('treats a zero fee as settled rather than outstanding', () => {
    const app = { university: 'TU', fee: { amount: 0, currency: 'EUR' } }
    const feeCheck = readiness(app, documents).checks.find(c => c.label === 'Fee')
    expect(feeCheck.done).toBe(1)
  })

  it('does not penalise an application for parts that do not apply to it', () => {
    // No recommenders required at all — that should not drag the score down.
    const withRecs = { university: 'A', professor: 'B', recommenders: [{ status: 'not_asked' }] }
    const withoutRecs = { university: 'A', professor: 'B' }
    expect(readiness(withoutRecs, documents).percent)
      .toBeGreaterThan(readiness(withRecs, documents).percent)
  })
})

describe('responseRate', () => {
  // The old calculation divided by every application, drafts included, so
  // starting a new application made your response rate drop — the number went
  // down as a reward for doing more work.
  it('counts only applications that were genuinely submitted', () => {
    const apps = [
      { stage: STAGE.NOT_STARTED },
      { stage: STAGE.IN_PROGRESS },
      { stage: STAGE.READY_TO_SEND },
      { stage: STAGE.SUBMITTED },
      { stage: STAGE.INTERVIEW },
    ]
    const r = responseRate(apps)
    expect(r.sent).toBe(2)      // submitted + interview
    expect(r.responded).toBe(1) // interview
    expect(r.rate).toBe(50)
  })

  it('does not fall when a new draft is created', () => {
    const before = [{ stage: STAGE.SUBMITTED }, { stage: STAGE.OFFER }]
    const after = [...before, { stage: STAGE.IN_PROGRESS }]
    expect(responseRate(after).rate).toBe(responseRate(before).rate)
  })

  it('returns null rather than 0% when nothing has been sent', () => {
    // 0% implies failure; null means "no data yet", and the UI can say so.
    expect(responseRate([{ stage: STAGE.IN_PROGRESS }])).toBeNull()
    expect(responseRate([])).toBeNull()
  })

  it('counts a waitlist as a response', () => {
    expect(responseRate([{ stage: STAGE.WAITLIST }]).rate).toBe(100)
  })
})

describe('emailReplyRate', () => {
  it('measures replies against emails actually sent', () => {
    const apps = [
      { emailed: { sentAt: '2026-01-01', replied: true } },
      { emailed: { sentAt: '2026-01-02', replied: false } },
      { }, // never emailed — must not be in the denominator
    ]
    expect(emailReplyRate(apps)).toMatchObject({ rate: 50, replied: 1, sent: 2 })
  })

  it('returns null when no outreach has happened', () => {
    expect(emailReplyRate([{ stage: STAGE.SUBMITTED }])).toBeNull()
  })
})

describe('knownEntities', () => {
  it('collects unique names across applications and leads for autocomplete', () => {
    const apps = [{ university: 'MIT', professor: 'Prof. A', professor2: 'Prof. B' }]
    const leads = [{ university: 'MIT', professor: 'Prof. C' }, { university: 'ETH Zürich' }]
    const e = knownEntities(apps, leads)
    expect(e.universities).toEqual(['ETH Zürich', 'MIT'])
    expect(e.professors).toEqual(['Prof. A', 'Prof. B', 'Prof. C'])
  })
})

describe('findDuplicate', () => {
  const existing = [{ id: 'a1', university: 'MIT', professor: 'Prof. Golland' }]

  it('catches the same lab entered twice, ignoring case and spacing', () => {
    expect(findDuplicate({ university: '  mit ', professor: 'prof. golland' }, existing, []))
      .toMatchObject({ id: 'a1' })
  })

  it('does not flag a different professor at the same university', () => {
    // Applying to two labs at one university is normal, not a mistake.
    expect(findDuplicate({ university: 'MIT', professor: 'Prof. Someone Else' }, existing, []))
      .toBeNull()
  })

  it('does not flag a record against itself while editing', () => {
    expect(findDuplicate({ university: 'MIT', professor: 'Prof. Golland' }, existing, [], 'a1'))
      .toBeNull()
  })
})
