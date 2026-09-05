// src/lib/model.js
// ─────────────────────────────────────────────────────────────────────────────
// The domain vocabulary. Everything the app knows about the shape of a PhD
// application lives here, so a stage, a colour and a label can never disagree
// between two screens.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Application lifecycle ───────────────────────────────────────────────────
//
// The old model had five statuses — applied / emailed / interview / offer /
// rejected — with no way to say "I am still filling this in". Converting a lead
// stamped `applied` immediately, so drafts were counted as submissions and every
// statistic downstream was wrong.
//
// Two things changed. There are now genuine pre-submission stages, and `emailed`
// stopped being a stage at all: emailing a professor is an *action* you take
// while at some stage, not a stage itself. You can now be in progress AND have
// emailed, which was impossible before.

export const STAGE = {
  NOT_STARTED:    'not_started',
  IN_PROGRESS:    'in_progress',
  READY_TO_SEND:  'ready_to_send',
  SUBMITTED:      'submitted',
  UNDER_REVIEW:   'under_review',
  INTERVIEW:      'interview',
  OFFER:          'offer',
  WAITLIST:       'waitlist',
  REJECTED:       'rejected',
  WITHDRAWN:      'withdrawn',
  MISSED_DEADLINE:'missed_deadline',
}

/**
 * Stage metadata. `group` drives filtering and stats; `tone` maps to the colour
 * signifiers in the UX charter (rose = urgent/bad, amber = attention, sage =
 * good, sky = informational, ink = neutral).
 */
export const STAGES = {
  [STAGE.NOT_STARTED]: {
    label: 'Not started',
    short: 'Not started',
    group: 'preparing',
    tone: 'ink',
    icon: 'Circle',
    help: 'Shortlisted, but you have not begun the application yet.',
    order: 10,
  },
  [STAGE.IN_PROGRESS]: {
    label: 'In progress',
    short: 'In progress',
    group: 'preparing',
    tone: 'amber',
    icon: 'PenLine',
    help: 'You are actively filling this in — writing the SOP, gathering documents.',
    order: 20,
  },
  [STAGE.READY_TO_SEND]: {
    label: 'Ready to send',
    short: 'Ready',
    group: 'preparing',
    tone: 'sky',
    icon: 'PackageCheck',
    help: 'Everything is done. Waiting on the portal opening, a recommender, or your own final check.',
    order: 30,
  },
  [STAGE.SUBMITTED]: {
    label: 'Submitted',
    short: 'Submitted',
    group: 'active',
    tone: 'sage',
    icon: 'Send',
    help: 'Sent. This is the first stage that counts as an application in your stats.',
    order: 40,
  },
  [STAGE.UNDER_REVIEW]: {
    label: 'Under review',
    short: 'In review',
    group: 'active',
    tone: 'sky',
    icon: 'Hourglass',
    help: 'Acknowledged by the department and being considered.',
    order: 50,
  },
  [STAGE.INTERVIEW]: {
    label: 'Interview',
    short: 'Interview',
    group: 'active',
    tone: 'sage',
    icon: 'Video',
    help: 'Interview offered or scheduled.',
    order: 60,
  },
  [STAGE.OFFER]: {
    label: 'Offer',
    short: 'Offer',
    group: 'decided',
    tone: 'success',
    icon: 'PartyPopper',
    help: 'Admitted.',
    order: 70,
  },
  [STAGE.WAITLIST]: {
    label: 'Waitlisted',
    short: 'Waitlist',
    group: 'decided',
    tone: 'amber',
    icon: 'ListOrdered',
    help: 'Held on a waiting list pending other candidates decisions.',
    order: 80,
  },
  [STAGE.REJECTED]: {
    label: 'Rejected',
    short: 'Rejected',
    group: 'decided',
    tone: 'ink',
    icon: 'XCircle',
    help: 'Not selected.',
    order: 90,
  },
  [STAGE.WITHDRAWN]: {
    label: 'Withdrawn',
    short: 'Withdrawn',
    group: 'decided',
    tone: 'ink',
    icon: 'Undo2',
    help: 'You pulled out — accepted elsewhere, or changed your mind.',
    order: 100,
  },
  [STAGE.MISSED_DEADLINE]: {
    label: 'Missed deadline',
    short: 'Missed',
    group: 'decided',
    tone: 'rose',
    icon: 'CalendarX',
    help: 'The deadline passed without a submission.',
    order: 110,
  },
}

export const STAGE_ORDER = Object.keys(STAGES).sort((a, b) => STAGES[a].order - STAGES[b].order)

/** Stages before the application was actually sent. */
export const PREPARING_STAGES = STAGE_ORDER.filter(s => STAGES[s].group === 'preparing')

/** Stages that mean the application genuinely went out. Stats count only these. */
export const SUBMITTED_STAGES = STAGE_ORDER.filter(s => STAGES[s].group !== 'preparing')

/** A decision has landed — nothing further to do. */
export const CLOSED_STAGES = [STAGE.OFFER, STAGE.REJECTED, STAGE.WITHDRAWN, STAGE.MISSED_DEADLINE]

export const isPreparing = (stage) => PREPARING_STAGES.includes(stage)
export const isSubmitted = (stage) => SUBMITTED_STAGES.includes(stage)
export const isClosed    = (stage) => CLOSED_STAGES.includes(stage)

/**
 * Legacy status -> new stage.
 *
 * `applied` is deliberately NOT mapped to `submitted`. Under the old model a card
 * became "applied" the moment a lead was converted, whether or not anything had
 * been sent — so treating it as a submission would manufacture history that
 * never happened. Every legacy row is flagged for the owner to confirm instead.
 */
export const LEGACY_STATUS_TO_STAGE = {
  applied:   STAGE.IN_PROGRESS,
  emailed:   STAGE.IN_PROGRESS,
  interview: STAGE.INTERVIEW,
  offer:     STAGE.OFFER,
  rejected:  STAGE.REJECTED,
}

// ─── Lead triage ─────────────────────────────────────────────────────────────
// Previously a lead could only be `lead` or `converted`, so one you had decided
// against sat in the list forever with no way to clear it but deletion.

export const LEAD_STATE = {
  ACTIVE:         'active',
  CONVERTED:      'converted',
  NOT_INTERESTED: 'not_interested',
  EXPIRED:        'expired',
}

export const LEAD_STATES = {
  [LEAD_STATE.ACTIVE]:         { label: 'Active',         tone: 'sky',  help: 'Still considering this one.' },
  [LEAD_STATE.CONVERTED]:      { label: 'Converted',      tone: 'sage', help: 'Promoted to a full application.' },
  [LEAD_STATE.NOT_INTERESTED]: { label: 'Not interested', tone: 'ink',  help: 'Ruled out. Kept for the record, hidden from the active list.' },
  [LEAD_STATE.EXPIRED]:        { label: 'Deadline passed',tone: 'ink',  help: 'The window closed before you applied.' },
}

// ─── Priority tiers ──────────────────────────────────────────────────────────

export const PRIORITY = { DREAM: 'dream', TARGET: 'target', SAFE: 'safe' }

export const PRIORITIES = {
  [PRIORITY.DREAM]:  { label: 'Dream',  tone: 'rose',  order: 1, help: 'A stretch. Worth the effort even at long odds.' },
  [PRIORITY.TARGET]: { label: 'Target', tone: 'amber', order: 2, help: 'A realistic, well-matched fit.' },
  [PRIORITY.SAFE]:   { label: 'Safe',   tone: 'sage',  order: 3, help: 'Strong chance of admission.' },
}

// ─── Recommender (LOR) status ────────────────────────────────────────────────
// A missing letter of recommendation kills an application silently — the portal
// simply never completes. Tracked per application, per recommender.

export const LOR_STATUS = {
  NOT_ASKED: 'not_asked',
  ASKED:     'asked',
  AGREED:    'agreed',
  SUBMITTED: 'submitted',
  DECLINED:  'declined',
}

export const LOR_STATUSES = {
  [LOR_STATUS.NOT_ASKED]: { label: 'Not asked', tone: 'ink',   order: 1, blocking: true },
  [LOR_STATUS.ASKED]:     { label: 'Asked',     tone: 'amber', order: 2, blocking: true },
  [LOR_STATUS.AGREED]:    { label: 'Agreed',    tone: 'sky',   order: 3, blocking: true },
  [LOR_STATUS.SUBMITTED]: { label: 'Submitted', tone: 'sage',  order: 4, blocking: false },
  [LOR_STATUS.DECLINED]:  { label: 'Declined',  tone: 'rose',  order: 5, blocking: true },
}

// ─── Test scores and their validity windows ──────────────────────────────────
// English and aptitude scores expire. A score that lapses mid-cycle is a silent
// disqualification, so the app warns before it happens.

export const TEST_TYPE = {
  GRE: 'GRE', GRE_SUBJECT: 'GRE Subject', TOEFL: 'TOEFL',
  IELTS: 'IELTS', DUOLINGO: 'Duolingo', PTE: 'PTE', GATE: 'GATE',
}

export const TESTS = {
  [TEST_TYPE.GRE]:         { label: 'GRE General', validityYears: 5, max: 340, help: 'Valid five years from the test date.' },
  [TEST_TYPE.GRE_SUBJECT]: { label: 'GRE Subject', validityYears: 5, max: 990 },
  [TEST_TYPE.TOEFL]:       { label: 'TOEFL iBT',   validityYears: 2, max: 120, help: 'Valid two years. Many programmes will not accept an expired score even by a day.' },
  [TEST_TYPE.IELTS]:       { label: 'IELTS',       validityYears: 2, max: 9 },
  [TEST_TYPE.DUOLINGO]:    { label: 'Duolingo English Test', validityYears: 2, max: 160 },
  [TEST_TYPE.PTE]:         { label: 'PTE Academic',validityYears: 2, max: 90 },
  [TEST_TYPE.GATE]:        { label: 'GATE',        validityYears: 3, max: 100 },
}

// ─── Credential evaluation ───────────────────────────────────────────────────
// Indian transcripts routinely need a WES/ECE evaluation for US programmes, and
// it takes weeks. Starting late is a common, avoidable way to miss a deadline.

export const EVAL_PROVIDER = { WES: 'WES', ECE: 'ECE', SPANTRAN: 'SpanTran', NACES_OTHER: 'Other NACES member' }

export const EVAL_STATUS = {
  NOT_STARTED: 'not_started',
  DOCS_SENT:   'docs_sent',
  IN_REVIEW:   'in_review',
  COMPLETED:   'completed',
}

export const EVAL_STATUSES = {
  [EVAL_STATUS.NOT_STARTED]: { label: 'Not started', tone: 'ink' },
  [EVAL_STATUS.DOCS_SENT]:   { label: 'Documents sent', tone: 'amber' },
  [EVAL_STATUS.IN_REVIEW]:   { label: 'In review', tone: 'sky' },
  [EVAL_STATUS.COMPLETED]:   { label: 'Completed', tone: 'sage' },
}

// ─── Countries, their deadline timezones and currencies ──────────────────────
//
// Picking a country sets a sensible default timezone and currency (UX charter #1
// — defaults that read as recommendations). The timezone is the one universities
// in that country usually quote deadlines in; where a country spans several, the
// dominant academic one is used and the field stays editable.

export const COUNTRIES = [
  { code: 'US', name: 'United States',   flag: '🇺🇸', tz: 'America/New_York',    currency: 'USD', note: 'Many US deadlines are 11:59 PM Eastern regardless of where the school is.' },
  { code: 'UK', name: 'United Kingdom',  flag: '🇬🇧', tz: 'Europe/London',       currency: 'GBP' },
  { code: 'CA', name: 'Canada',          flag: '🇨🇦', tz: 'America/Toronto',     currency: 'CAD' },
  { code: 'DE', name: 'Germany',         flag: '🇩🇪', tz: 'Europe/Berlin',       currency: 'EUR', note: 'Most German PhD positions are salaried and charge no application fee.' },
  { code: 'NL', name: 'Netherlands',     flag: '🇳🇱', tz: 'Europe/Amsterdam',    currency: 'EUR' },
  { code: 'CH', name: 'Switzerland',     flag: '🇨🇭', tz: 'Europe/Zurich',       currency: 'CHF' },
  { code: 'SE', name: 'Sweden',          flag: '🇸🇪', tz: 'Europe/Stockholm',    currency: 'SEK' },
  { code: 'FR', name: 'France',          flag: '🇫🇷', tz: 'Europe/Paris',        currency: 'EUR' },
  { code: 'AU', name: 'Australia',       flag: '🇦🇺', tz: 'Australia/Sydney',    currency: 'AUD' },
  { code: 'NZ', name: 'New Zealand',     flag: '🇳🇿', tz: 'Pacific/Auckland',    currency: 'NZD' },
  { code: 'SG', name: 'Singapore',       flag: '🇸🇬', tz: 'Asia/Singapore',      currency: 'SGD' },
  { code: 'HK', name: 'Hong Kong',       flag: '🇭🇰', tz: 'Asia/Hong_Kong',      currency: 'HKD' },
  { code: 'JP', name: 'Japan',           flag: '🇯🇵', tz: 'Asia/Tokyo',          currency: 'JPY' },
  { code: 'KR', name: 'South Korea',     flag: '🇰🇷', tz: 'Asia/Seoul',          currency: 'KRW' },
  { code: 'IE', name: 'Ireland',         flag: '🇮🇪', tz: 'Europe/Dublin',       currency: 'EUR' },
  { code: 'DK', name: 'Denmark',         flag: '🇩🇰', tz: 'Europe/Copenhagen',   currency: 'DKK' },
  { code: 'NO', name: 'Norway',          flag: '🇳🇴', tz: 'Europe/Oslo',         currency: 'NOK' },
  { code: 'FI', name: 'Finland',         flag: '🇫🇮', tz: 'Europe/Helsinki',     currency: 'EUR' },
  { code: 'BE', name: 'Belgium',         flag: '🇧🇪', tz: 'Europe/Brussels',     currency: 'EUR' },
  { code: 'AT', name: 'Austria',         flag: '🇦🇹', tz: 'Europe/Vienna',       currency: 'EUR' },
  { code: 'IT', name: 'Italy',           flag: '🇮🇹', tz: 'Europe/Rome',         currency: 'EUR' },
  { code: 'ES', name: 'Spain',           flag: '🇪🇸', tz: 'Europe/Madrid',       currency: 'EUR' },
  { code: 'IN', name: 'India',           flag: '🇮🇳', tz: 'Asia/Kolkata',        currency: 'INR' },
  { code: 'OTHER', name: 'Other',        flag: '🌍', tz: 'UTC',                 currency: 'USD' },
]

export const countryByCode = (code) => COUNTRIES.find(c => c.code === code) || null

/** Default timezone for a country — used to pre-fill a deadline's zone. */
export const timezoneForCountry = (code) => countryByCode(code)?.tz || 'UTC'
export const currencyForCountry = (code) => countryByCode(code)?.currency || 'USD'

export const CURRENCIES = {
  USD: { symbol: '$',   name: 'US Dollar' },
  GBP: { symbol: '£',   name: 'Pound Sterling' },
  EUR: { symbol: '€',   name: 'Euro' },
  CAD: { symbol: 'C$',  name: 'Canadian Dollar' },
  AUD: { symbol: 'A$',  name: 'Australian Dollar' },
  NZD: { symbol: 'NZ$', name: 'New Zealand Dollar' },
  CHF: { symbol: 'CHF', name: 'Swiss Franc' },
  SGD: { symbol: 'S$',  name: 'Singapore Dollar' },
  HKD: { symbol: 'HK$', name: 'Hong Kong Dollar' },
  JPY: { symbol: '¥',   name: 'Japanese Yen' },
  KRW: { symbol: '₩',   name: 'South Korean Won' },
  SEK: { symbol: 'kr',  name: 'Swedish Krona' },
  DKK: { symbol: 'kr',  name: 'Danish Krone' },
  NOK: { symbol: 'kr',  name: 'Norwegian Krone' },
  INR: { symbol: '₹',   name: 'Indian Rupee' },
}

// ─── Application route ───────────────────────────────────────────────────────

export const APP_TYPE = { PORTAL: 'portal', EMAIL: 'email', BOTH: 'both' }

export const APP_TYPES = {
  [APP_TYPE.PORTAL]: { label: 'Portal', icon: 'Globe',  help: 'Submitted through an online application system.' },
  [APP_TYPE.EMAIL]:  { label: 'Email',  icon: 'Mail',   help: 'Direct approach to the professor by email.' },
  [APP_TYPE.BOTH]:   { label: 'Both',   icon: 'Shuffle',help: 'Emailed the professor and applied through the portal.' },
}

// ─── Intake cycles ───────────────────────────────────────────────────────────

export const INTAKE_TERMS = ['Fall', 'Spring', 'Summer', 'Winter', 'Rolling']

/**
 * The intake a user starting today is most likely applying for.
 *
 * Northern-hemisphere PhD admissions run roughly a year ahead: applications
 * submitted in late 2026 are for Fall 2027. Before roughly April the current
 * year's Fall is still plausible; after it, the next one is.
 */
export function suggestedIntake(now = new Date()) {
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed
  if (month <= 2) return `Fall ${year}`
  return `Fall ${year + 1}`
}

export function intakeOptions(now = new Date(), span = 3) {
  const year = now.getFullYear()
  const out = []
  for (let y = year; y <= year + span; y++) {
    out.push(`Fall ${y}`, `Spring ${y + 1}`)
  }
  return out
}

// ─── Research areas ──────────────────────────────────────────────────────────
// Seeded from the owner's field, but the input accepts anything — a fixed list
// that cannot be extended is a trap, not a default.

export const DEFAULT_RESEARCH_AREAS = [
  'Computer Vision',
  'Medical Imaging',
  'Multimodal AI',
  'Machine Learning',
  'Reinforcement Learning',
  'Natural Language Processing',
  'Computational Biology',
  'Robotics',
  'Human-Computer Interaction',
]

// ─── Document defaults ───────────────────────────────────────────────────────
// Seeded on first run so the checklist is never empty. `initializeDefaultDocuments`
// existed before but was never called anywhere, leaving new accounts with nothing.

export const DEFAULT_DOCUMENTS = [
  'Statement of Purpose (SOP)',
  'CV / Resume',
  'Letter of Rec — 1',
  'Letter of Rec — 2',
  'Letter of Rec — 3',
  'Transcripts',
  'Degree certificate',
  'English test score report',
  'GRE score report',
  'Research proposal',
  'Writing sample',
  'Passport copy',
]
