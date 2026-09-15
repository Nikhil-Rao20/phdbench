// scripts/check-access-parity.mjs
// ─────────────────────────────────────────────────────────────────────────────
// `src/lib/access.js` lets the interface predict what the server will allow.
// `firestore.rules` is what the server actually enforces. When they disagree,
// the app confidently offers actions that are about to be refused — or worse,
// hides ones that would succeed, which looks like data loss.
//
// This cannot verify the rules are correct; only an emulator can do that. What
// it verifies is that the few values which MUST be identical in both files
// really are, and that the dangerous shapes are still present.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs'

const rules = readFileSync('firestore.rules', 'utf8')
const access = readFileSync('src/lib/access.js', 'utf8')

const failures = []
const ok = []

const check = (name, passed, detail = '') => {
  (passed ? ok : failures).push(detail ? `${name} — ${detail}` : name)
}

// ── The administrator address must match exactly ─────────────────────────────
const rulesAdmin = rules.match(/function adminEmail\(\)\s*\{\s*return\s*'([^']+)'/)?.[1]
const accessAdmin = access.match(/export const ADMIN_EMAIL\s*=\s*'([^']+)'/)?.[1]

check('admin email present in firestore.rules', Boolean(rulesAdmin))
check('admin email present in access.js', Boolean(accessAdmin))
check(
  'admin email identical in both files',
  Boolean(rulesAdmin) && rulesAdmin === accessAdmin,
  `rules="${rulesAdmin}" access="${accessAdmin}"`,
)

// ── Member cap must match ────────────────────────────────────────────────────
const accessMemberCap = Number(access.match(/membersPerGroup:\s*(\d+)/)?.[1])
const ruleMemberCaps = [...rules.matchAll(/memberEmails\.size\(\)\s*<=\s*(\d+)/g)].map(m => Number(m[1]))

check('group member cap declared in access.js', Number.isFinite(accessMemberCap))
check(
  'every memberEmails cap in the rules matches access.js',
  ruleMemberCaps.length > 0 && ruleMemberCaps.every(n => n === accessMemberCap),
  `rules=[${ruleMemberCaps}] access=${accessMemberCap}`,
)

// ── Invariants that must not be quietly deleted ──────────────────────────────
// Each of these is load-bearing: removing it opens a real hole, and the removal
// would otherwise be invisible in review.
const invariants = [
  [
    'access requests can only be created as pending',
    /allow create:[\s\S]*?status\s*==\s*'pending'/,
    'without this, anyone signing in could write themselves an approved record',
  ],
  [
    'a non-admin cannot change their own request status',
    /request\.resource\.data\.status\s*==\s*resource\.data\.status/,
    'lets an applicant approve themselves',
  ],
  [
    'group creator is pinned at creation',
    /allow create:[\s\S]*?createdBy\s*==\s*request\.auth\.uid/,
    'lets someone create a group administered by another person',
  ],
  [
    'createdBy cannot be reassigned on update',
    /request\.resource\.data\.createdBy\s*==\s*resource\.data\.createdBy/,
    'lets a group be handed to someone else, or orphaned',
  ],
  [
    'lead authorship is pinned at creation',
    /allow create:[\s\S]*?addedBy\s*==\s*request\.auth\.uid/,
    'lets a member post leads attributed to someone else',
  ],
  [
    'private namespace requires a uid match',
    /function ownsNamespace\(uid\)[\s\S]*?request\.auth\.uid\s*==\s*uid/,
    'this is the wall between one person\'s applications and another\'s',
  ],
  [
    'private namespace requires approval',
    /function ownsNamespace\(uid\)[\s\S]*?approved\(\)/,
    'an unapproved account could use the app by writing directly',
  ],
  [
    'email must be verified',
    /email_verified\s*==\s*true/,
    'an unverified address could impersonate the admin address',
  ],
  [
    'catch-all denies everything else',
    /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/,
    'any future collection would default to open',
  ],
]

for (const [name, pattern, why] of invariants) {
  check(name, pattern.test(rules), why)
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`Access parity: ${ok.length} passed, ${failures.length} failed\n`)
if (failures.length) {
  failures.forEach(f => console.log(`  ✗ ${f}`))
  console.log('\nThe rules and the interface disagree, or a security invariant was removed.')
  process.exit(1)
}
ok.forEach(o => console.log(`  ✓ ${o}`))
