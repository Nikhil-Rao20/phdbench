// src/lib/harnessData.js
// ─────────────────────────────────────────────────────────────────────────────
// Fixture data for the screenshot verification harness.
//
// This is not demo content for its own sake. Every record here exists to force a
// specific state onto the screen so the runner can photograph it: each stage in
// the ladder, a deadline that crosses the date line, an overdue item, a lapsed
// test score, an unasked recommender, a legacy record awaiting review, an
// archived record. If a state is not represented here, no screenshot proves it
// renders correctly.
//
// Never bundled into production — `UI_HARNESS` is a build-time flag.
// ─────────────────────────────────────────────────────────────────────────────

import { STAGE, LEAD_STATE, PRIORITY, LOR_STATUS, TEST_TYPE, EVAL_STATUS, EVAL_PROVIDER } from './model'

/** Firestore timestamps are `{ seconds }`; the fixtures must match that shape. */
const ts = (daysAgo) => ({ seconds: Math.floor((Date.now() - daysAgo * 86400000) / 1000), nanoseconds: 0 })

/** A date offset from today, as YYYY-MM-DD. */
const day = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

const DOC_IDS = {
  sop: 'doc-sop', cv: 'doc-cv', lor1: 'doc-lor1', lor2: 'doc-lor2', lor3: 'doc-lor3',
  transcripts: 'doc-transcripts', degree: 'doc-degree', english: 'doc-english',
  gre: 'doc-gre', proposal: 'doc-proposal', writing: 'doc-writing', passport: 'doc-passport',
}

const documents = [
  { id: DOC_IDS.sop,         name: 'Statement of Purpose (SOP)', order: 0 },
  { id: DOC_IDS.cv,          name: 'CV / Resume',                order: 1 },
  { id: DOC_IDS.lor1,        name: 'Letter of Rec — 1',          order: 2 },
  { id: DOC_IDS.lor2,        name: 'Letter of Rec — 2',          order: 3 },
  { id: DOC_IDS.lor3,        name: 'Letter of Rec — 3',          order: 4 },
  { id: DOC_IDS.transcripts, name: 'Transcripts',                order: 5 },
  { id: DOC_IDS.degree,      name: 'Degree certificate',         order: 6 },
  { id: DOC_IDS.english,     name: 'English test score report',  order: 7 },
  { id: DOC_IDS.gre,         name: 'GRE score report',           order: 8 },
  { id: DOC_IDS.proposal,    name: 'Research proposal',          order: 9 },
  { id: DOC_IDS.writing,     name: 'Writing sample',             order: 10 },
  { id: DOC_IDS.passport,    name: 'Passport copy',              order: 11 },
]

const REC = { advisor: 'rec-advisor', intern: 'rec-intern', collab: 'rec-collab' }

const profile = {
  id: 'main',
  schemaVersion: 2,
  displayName: 'Nikhil',
  homeCountry: 'IN',
  homeTimezone: 'Asia/Kolkata',
  accentColor: 'sage',
  onboardingCompleted: true,

  recommenders: [
    { id: REC.advisor, name: 'Prof. A. Ramesh',   email: 'ramesh@rgukt.ac.in',       institution: 'RGUKT Nuzvid',   relationship: 'Undergraduate advisor' },
    { id: REC.intern,  name: 'Dr. Helen Whitmore', email: 'h.whitmore@stanford.edu', institution: 'Stanford University', relationship: 'Internship supervisor' },
    { id: REC.collab,  name: 'Prof. S. Banerjee',  email: 'banerjee@iitkgp.ac.in',   institution: 'IIT Kharagpur',  relationship: 'Research collaborator' },
  ],

  testScores: [
    // Comfortably valid.
    { id: 'ts-gre',   type: TEST_TYPE.GRE,      score: '324',  takenOn: day(-400),  expiresOn: day(1425), subScores: { verbal: '160', quant: '164', awa: '4.0' } },
    // Expires inside the coming cycle — the case the expiry warning exists for.
    { id: 'ts-ielts', type: TEST_TYPE.IELTS,    score: '8.0',  takenOn: day(-680),  expiresOn: day(50),   subScores: { listening: '8.5', reading: '8.5', writing: '7.0', speaking: '8.0' } },
    // Already lapsed.
    { id: 'ts-toefl', type: TEST_TYPE.TOEFL,    score: '112',  takenOn: day(-900),  expiresOn: day(-170) },
  ],

  credentialEvals: [
    { id: 'ce-wes', provider: EVAL_PROVIDER.WES, status: EVAL_STATUS.IN_REVIEW, submittedOn: day(-24), refNumber: 'WES-4471902' },
  ],

  emailTemplates: [
    {
      id: 'tpl-cold',
      name: 'Cold outreach — first contact',
      subject: 'PhD inquiry — {{professor}} — Nikhil Rao (RGUKT)',
      body: 'Dear {{professor}},\n\nI am writing about PhD openings in {{lab}} for {{intake}}. Your recent work on {{paper}} overlaps closely with my own research on medical imaging.\n\n…',
    },
    {
      id: 'tpl-followup',
      name: 'Follow-up after no reply',
      subject: 'Re: PhD inquiry — Nikhil Rao',
      body: 'Dear {{professor}},\n\nFollowing up on my email of {{date}} regarding PhD opportunities in {{lab}}.\n\n…',
    },
  ],

  lastExportAt: ts(9),
}

const leads = [
  {
    id: 'lead-eth', schemaVersion: 2, state: LEAD_STATE.ACTIVE,
    university: 'ETH Zürich', labName: 'Biomedical Image Computing', professor: 'Prof. Ender Konukoglu',
    country: 'CH', researchArea: 'Medical Imaging', source: 'Lab website',
    labUrl: 'https://bmic.ee.ethz.ch/', priority: PRIORITY.DREAM, fitScore: 5,
    startDate: { date: day(12), time: '00:00', tz: 'Europe/Zurich' },
    deadline:  { date: day(48), time: '23:59', tz: 'Europe/Zurich' },
    fundingNote: 'Fully funded doctoral position, ~CHF 47k/yr',
    notes: 'Their 2026 work on uncertainty in segmentation is very close to my thesis.',
    createdAt: ts(6), updatedAt: ts(2),
  },
  {
    id: 'lead-mpi', schemaVersion: 2, state: LEAD_STATE.ACTIVE,
    university: 'Max Planck Institute for Intelligent Systems', labName: 'Empirical Inference',
    professor: 'Dr. Katrin Vogel', country: 'DE', researchArea: 'Machine Learning', source: 'LinkedIn',
    linkedinPost: 'https://linkedin.com/posts/example',
    priority: PRIORITY.TARGET, fitScore: 4,
    // Due very soon — drives the "critical" urgency band.
    deadline: { date: day(4), time: '23:59', tz: 'Europe/Berlin' },
    fundingNote: 'TV-L E13, 65%',
    notes: 'Posted on LinkedIn. No application fee. Needs a research statement, not an SOP.',
    createdAt: ts(3), updatedAt: ts(1),
  },
  {
    id: 'lead-nus', schemaVersion: 2, state: LEAD_STATE.ACTIVE,
    university: 'National University of Singapore', labName: 'Medical Vision Group',
    professor: 'Prof. Wei Lin Tan', country: 'SG', researchArea: 'Computer Vision', source: 'Conference',
    priority: PRIORITY.SAFE, fitScore: 3,
    deadline: { date: day(96), time: '17:00', tz: 'Asia/Singapore' },
    createdAt: ts(11), updatedAt: ts(11),
  },
  {
    id: 'lead-legacy', schemaVersion: 2, state: LEAD_STATE.ACTIVE,
    university: 'University of Edinburgh', labName: 'CDT in Biomedical AI',
    professor: 'Prof. Iain McAllister', country: 'UK', researchArea: 'Medical Imaging',
    source: 'Twitter/X',
    // A legacy bare-string deadline, to prove the migration path renders.
    deadline: day(30),
    priority: PRIORITY.TARGET, fitScore: 4,
    createdAt: ts(20), updatedAt: ts(20),
  },
  {
    id: 'lead-passed', schemaVersion: 2, state: LEAD_STATE.EXPIRED,
    university: 'KTH Royal Institute of Technology', labName: 'Division of Robotics',
    professor: 'Prof. Anna Lindqvist', country: 'SE', researchArea: 'Robotics', source: 'Email list',
    deadline: { date: day(-15), time: '23:59', tz: 'Europe/Stockholm' },
    createdAt: ts(60), updatedAt: ts(16),
  },
  {
    id: 'lead-no', schemaVersion: 2, state: LEAD_STATE.NOT_INTERESTED,
    university: 'University of Warwick', labName: 'Data Science', professor: 'Dr. P. Shah',
    country: 'UK', researchArea: 'Machine Learning', source: 'LinkedIn',
    notes: 'Self-funded only. Ruled out.',
    createdAt: ts(40), updatedAt: ts(30),
  },
  {
    id: 'lead-converted', schemaVersion: 2, state: LEAD_STATE.CONVERTED,
    university: 'University of Toronto', labName: 'Vector Institute', professor: 'Prof. Marcus Reid',
    country: 'CA', researchArea: 'Multimodal AI', source: 'LinkedIn',
    convertedToApp: 'app-toronto',
    createdAt: ts(35), updatedAt: ts(21),
  },
  {
    id: 'lead-archived', schemaVersion: 2, state: LEAD_STATE.ACTIVE,
    university: 'University of Melbourne', labName: 'CVPR Group', professor: 'Dr. J. Nguyen',
    country: 'AU', researchArea: 'Computer Vision', source: 'Other',
    archivedAt: ts(5),
    createdAt: ts(50), updatedAt: ts(5),
  },
]

const applications = [
  {
    // The state that was impossible before: actively being filled in, and the
    // professor has already been emailed.
    id: 'app-mit', schemaVersion: 2, stage: STAGE.IN_PROGRESS,
    university: 'MIT', department: 'EECS', labName: 'CSAIL — Medical Vision',
    professor: 'Prof. Polina Golland', country: 'US', researchArea: 'Medical Imaging',
    applicationType: 'both', intake: 'Fall 2027',
    priority: PRIORITY.DREAM, fitScore: 5,
    appUrl: 'https://gradapply.mit.edu/eecs',
    labUrl: 'https://people.csail.mit.edu/polina/',
    // Deadline crossing the date line: Dec 15 in Cambridge is Dec 16 in India.
    deadline: { date: day(38), time: '23:59', tz: 'America/New_York' },
    lorDeadline: { date: day(31), time: '23:59', tz: 'America/New_York' },
    emailed: { sentAt: day(-9), subject: 'PhD inquiry — Nikhil Rao (RGUKT)', replied: true },
    fee: { amount: 90, currency: 'USD', inrRate: 88.4, waiverRequested: true, waiverGranted: false, paid: false },
    requiredDocs: [DOC_IDS.sop, DOC_IDS.cv, DOC_IDS.lor1, DOC_IDS.lor2, DOC_IDS.lor3, DOC_IDS.transcripts, DOC_IDS.gre, DOC_IDS.english],
    submittedDocs: { [DOC_IDS.sop]: true, [DOC_IDS.cv]: true, [DOC_IDS.transcripts]: true, [DOC_IDS.gre]: true },
    recommenders: [
      { recommenderId: REC.advisor, status: LOR_STATUS.SUBMITTED, askedAt: day(-30), submittedAt: day(-6) },
      { recommenderId: REC.intern,  status: LOR_STATUS.AGREED,    askedAt: day(-28) },
      // Never asked, with the deadline a month out — the silent killer.
      { recommenderId: REC.collab,  status: LOR_STATUS.NOT_ASKED },
    ],
    driveLink: 'https://drive.google.com/drive/folders/example',
    whyThisLab: 'Their segmentation-uncertainty work is the closest match anywhere to my undergraduate thesis, and the lab takes students from non-US undergraduate programmes.',
    sopAngle: 'Lead with the Stanford internship, then the IIT KGP collaboration, then the RGUKT thesis.',
    createdAt: ts(30), updatedAt: ts(1),
  },
  {
    id: 'app-cmu', schemaVersion: 2, stage: STAGE.READY_TO_SEND,
    university: 'Carnegie Mellon University', department: 'Robotics Institute', labName: 'Biorobotics',
    professor: 'Prof. Elena Marsh', country: 'US', researchArea: 'Robotics',
    applicationType: 'portal', intake: 'Fall 2027',
    priority: PRIORITY.DREAM, fitScore: 5,
    // Inside the final week.
    deadline: { date: day(5), time: '15:00', tz: 'America/New_York' },
    fee: { amount: 75, currency: 'USD', inrRate: 88.4, waiverRequested: false, waiverGranted: false, paid: true, paidAt: day(-3) },
    requiredDocs: [DOC_IDS.sop, DOC_IDS.cv, DOC_IDS.lor1, DOC_IDS.lor2, DOC_IDS.transcripts, DOC_IDS.gre],
    submittedDocs: { [DOC_IDS.sop]: true, [DOC_IDS.cv]: true, [DOC_IDS.lor1]: true, [DOC_IDS.lor2]: true, [DOC_IDS.transcripts]: true, [DOC_IDS.gre]: true },
    recommenders: [
      { recommenderId: REC.advisor, status: LOR_STATUS.SUBMITTED, askedAt: day(-40), submittedAt: day(-10) },
      { recommenderId: REC.intern,  status: LOR_STATUS.SUBMITTED, askedAt: day(-40), submittedAt: day(-8) },
    ],
    createdAt: ts(45), updatedAt: ts(2),
  },
  {
    id: 'app-toronto', schemaVersion: 2, stage: STAGE.SUBMITTED,
    university: 'University of Toronto', department: 'Computer Science', labName: 'Vector Institute',
    professor: 'Prof. Marcus Reid', country: 'CA', researchArea: 'Multimodal AI',
    applicationType: 'both', intake: 'Fall 2027',
    priority: PRIORITY.TARGET, fitScore: 4,
    fromLeadId: 'lead-converted',
    deadline: { date: day(-12), time: '23:59', tz: 'America/Toronto' },
    submittedAt: ts(14),
    expectedDecision: { date: day(60), time: '23:59', tz: 'America/Toronto' },
    emailed: { sentAt: day(-40), subject: 'PhD inquiry — multimodal medical AI', replied: true },
    fee: { amount: 125, currency: 'CAD', inrRate: 63.2, waiverRequested: false, waiverGranted: false, paid: true, paidAt: day(-14) },
    requiredDocs: [DOC_IDS.sop, DOC_IDS.cv, DOC_IDS.lor1, DOC_IDS.lor2, DOC_IDS.lor3, DOC_IDS.transcripts, DOC_IDS.english],
    submittedDocs: { [DOC_IDS.sop]: true, [DOC_IDS.cv]: true, [DOC_IDS.lor1]: true, [DOC_IDS.lor2]: true, [DOC_IDS.lor3]: true, [DOC_IDS.transcripts]: true, [DOC_IDS.english]: true },
    recommenders: [
      { recommenderId: REC.advisor, status: LOR_STATUS.SUBMITTED, askedAt: day(-50), submittedAt: day(-20) },
      { recommenderId: REC.intern,  status: LOR_STATUS.SUBMITTED, askedAt: day(-50), submittedAt: day(-18) },
      { recommenderId: REC.collab,  status: LOR_STATUS.SUBMITTED, askedAt: day(-50), submittedAt: day(-16) },
    ],
    createdAt: ts(50), updatedAt: ts(14),
  },
  {
    id: 'app-epfl', schemaVersion: 2, stage: STAGE.INTERVIEW,
    university: 'EPFL', department: 'School of Computer and Communication Sciences',
    labName: 'Signal Processing Laboratory', professor: 'Prof. Léa Dubois',
    country: 'CH', researchArea: 'Computer Vision',
    applicationType: 'portal', intake: 'Fall 2027',
    priority: PRIORITY.TARGET, fitScore: 5,
    deadline: { date: day(-30), time: '23:59', tz: 'Europe/Zurich' },
    submittedAt: ts(32),
    interview: { scheduledAt: day(3), time: '15:00', tz: 'Europe/Zurich', mode: 'Video call', link: 'https://epfl.zoom.us/j/example', panel: 'Prof. Dubois + 2 postdocs' },
    fee: { amount: 50, currency: 'CHF', inrRate: 110.1, waiverRequested: false, waiverGranted: false, paid: true, paidAt: day(-32) },
    requiredDocs: [DOC_IDS.sop, DOC_IDS.cv, DOC_IDS.lor1, DOC_IDS.lor2, DOC_IDS.transcripts, DOC_IDS.english, DOC_IDS.proposal],
    submittedDocs: { [DOC_IDS.sop]: true, [DOC_IDS.cv]: true, [DOC_IDS.lor1]: true, [DOC_IDS.lor2]: true, [DOC_IDS.transcripts]: true, [DOC_IDS.english]: true, [DOC_IDS.proposal]: true },
    interviewNotes: 'Asked to present the thesis for 10 minutes. Prepare slides on the uncertainty experiments.',
    createdAt: ts(70), updatedAt: ts(2),
  },
  {
    id: 'app-tue', schemaVersion: 2, stage: STAGE.OFFER,
    university: 'TU Eindhoven', department: 'Mathematics and Computer Science',
    labName: 'Medical Image Analysis', professor: 'Dr. Sander Bakker',
    country: 'NL', researchArea: 'Medical Imaging',
    applicationType: 'email', intake: 'Fall 2027',
    priority: PRIORITY.SAFE, fitScore: 4,
    submittedAt: ts(60), decidedAt: ts(4),
    emailed: { sentAt: day(-75), subject: 'PhD position inquiry — medical image analysis', replied: true },
    fee: { amount: 0, currency: 'EUR', inrRate: 95.8, waiverRequested: false, waiverGranted: false, paid: true },
    requiredDocs: [DOC_IDS.cv, DOC_IDS.transcripts, DOC_IDS.english],
    submittedDocs: { [DOC_IDS.cv]: true, [DOC_IDS.transcripts]: true, [DOC_IDS.english]: true },
    // Offers come with their own deadline, and it is the one that matters most.
    expectedDecision: { date: day(21), time: '23:59', tz: 'Europe/Amsterdam' },
    whyThisLab: 'Salaried position, four years, strong clinical collaboration with Catharina Hospital.',
    createdAt: ts(80), updatedAt: ts(4),
  },
  {
    id: 'app-ucl', schemaVersion: 2, stage: STAGE.REJECTED,
    university: 'University College London', department: 'Computer Science',
    labName: 'Centre for Medical Image Computing', professor: 'Prof. R. Hollis',
    country: 'UK', researchArea: 'Medical Imaging',
    applicationType: 'portal', intake: 'Fall 2027',
    priority: PRIORITY.DREAM, fitScore: 4,
    submittedAt: ts(55), decidedAt: ts(10),
    fee: { amount: 90, currency: 'GBP', inrRate: 111.9, waiverRequested: true, waiverGranted: true, paid: false },
    requiredDocs: [DOC_IDS.sop, DOC_IDS.cv, DOC_IDS.lor1, DOC_IDS.lor2, DOC_IDS.transcripts, DOC_IDS.proposal],
    submittedDocs: { [DOC_IDS.sop]: true, [DOC_IDS.cv]: true, [DOC_IDS.lor1]: true, [DOC_IDS.lor2]: true, [DOC_IDS.transcripts]: true, [DOC_IDS.proposal]: true },
    createdAt: ts(75), updatedAt: ts(10),
  },
  {
    // A legacy record: migrated, unconfirmed, awaiting the owner's review.
    id: 'app-legacy', schemaVersion: 2, stage: STAGE.IN_PROGRESS,
    needsReview: true, legacyStatus: 'applied',
    university: 'KU Leuven', department: 'Electrical Engineering', labName: 'PSI — Vision',
    professor: 'Prof. T. Vermeulen', country: 'BE', researchArea: 'Computer Vision',
    applicationType: 'portal',
    deadline: day(25), // legacy bare string
    requiredDocs: [DOC_IDS.sop, DOC_IDS.cv],
    submittedDocs: { [DOC_IDS.sop]: true },
    createdAt: ts(90), updatedAt: ts(90),
  },
  {
    id: 'app-not-started', schemaVersion: 2, stage: STAGE.NOT_STARTED,
    university: 'University of Tokyo', department: 'Information Science and Technology',
    labName: 'Medical AI Lab', professor: 'Prof. K. Tanaka',
    country: 'JP', researchArea: 'Medical Imaging',
    applicationType: 'portal', intake: 'Fall 2027',
    priority: PRIORITY.SAFE, fitScore: 3,
    deadline: { date: day(72), time: '17:00', tz: 'Asia/Tokyo' },
    requiredDocs: [DOC_IDS.sop, DOC_IDS.cv, DOC_IDS.transcripts, DOC_IDS.english],
    submittedDocs: {},
    createdAt: ts(8), updatedAt: ts(8),
  },
  {
    id: 'app-missed', schemaVersion: 2, stage: STAGE.MISSED_DEADLINE,
    university: 'University of Amsterdam', department: 'Informatics Institute',
    labName: 'AMLab', professor: 'Prof. Joost de Vries',
    country: 'NL', researchArea: 'Machine Learning',
    applicationType: 'portal', intake: 'Fall 2027',
    priority: PRIORITY.TARGET, fitScore: 3,
    deadline: { date: day(-6), time: '23:59', tz: 'Europe/Amsterdam' },
    requiredDocs: [DOC_IDS.sop, DOC_IDS.cv, DOC_IDS.lor1],
    submittedDocs: { [DOC_IDS.cv]: true },
    createdAt: ts(40), updatedAt: ts(6),
  },
  {
    id: 'app-archived', schemaVersion: 2, stage: STAGE.WITHDRAWN,
    university: 'University of Sydney', department: 'Computer Science', labName: 'Vision Lab',
    professor: 'Dr. M. Fraser', country: 'AU', researchArea: 'Computer Vision',
    applicationType: 'portal',
    archivedAt: ts(7),
    requiredDocs: [], submittedDocs: {},
    createdAt: ts(65), updatedAt: ts(7),
  },
]

export function harnessData() {
  return { leads, applications, documents, profile }
}

export const harnessUser = {
  uid: 'harness-user',
  displayName: 'Nikhil Rao',
  email: 'nikhilproffesion@gmail.com',
  photoURL: null,
}

/** Follow-ups and activity, keyed by application id. */
export const harnessSubcollections = {
  'app-mit': {
    followups: [
      { id: 'fu-1', note: 'Sent the follow-up email mentioning their MICCAI paper.', date: day(-9), replied: true, createdAt: ts(9) },
      { id: 'fu-2', note: 'Prof. Golland replied — asked for the thesis draft.', date: day(-7), replied: true, createdAt: ts(7) },
      { id: 'fu-3', note: 'Sent thesis draft and transcript.', date: day(-6), replied: false, createdAt: ts(6) },
    ],
    activity: [
      { id: 'ac-1', note: 'Application created', system: true, createdAt: ts(30) },
      { id: 'ac-2', note: 'Stage: Not started → In progress', system: true, createdAt: ts(28) },
      { id: 'ac-3', note: 'Emailed Prof. Golland', system: true, createdAt: ts(9) },
      { id: 'ac-4', note: 'SOP first draft done — needs the lab-specific paragraph.', system: false, createdAt: ts(5) },
      { id: 'ac-5', note: 'Document submitted: Transcripts', system: true, createdAt: ts(3) },
    ],
  },
  'app-toronto': {
    followups: [
      { id: 'fu-4', note: 'Confirmation email received from the graduate office.', date: day(-13), replied: false, createdAt: ts(13) },
    ],
    activity: [
      { id: 'ac-6', note: 'Converted from a saved lead', system: true, createdAt: ts(50) },
      { id: 'ac-7', note: 'Stage: Ready to send → Submitted', system: true, createdAt: ts(14) },
    ],
  },
}
