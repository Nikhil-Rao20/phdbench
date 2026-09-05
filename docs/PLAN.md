# PhDBench v2 — Rebuild Plan

Owner: Nikhil Rao. Single-user tool. Applying from India to universities worldwide.
Built against `docs/UX_CHARTER.md`. Every phase ends with automated checks +
desktop and mobile screenshot review before the next phase begins.

---

## Decisions taken

| Decision | Choice |
|---|---|
| Access | Locked to the owner's Google account (rules + UI gate) |
| Lifecycle | Full ladder: draft states + outcome states, `emailed` demoted to an action |
| Reminders | In-app "needs attention" panel + `.ics` calendar export |
| Deletion | Archive by default; permanent delete only from Archive, type-to-confirm |
| Undo | Toast with undo on every destructive action |
| Backup | JSON export + import from Settings |
| Architecture | Realtime Firestore listeners + offline persistence + PWA |
| Migration | Lossless; existing apps flagged `needsReview`; one-time review screen |
| Mobile nav | Floating dock |
| Theme | Light only. No dark mode. |

Not building (explicitly deselected): post-offer visa/I-20/CAS pipeline, dark mode,
email/push reminders requiring a backend.

---

## Phase 0 — Foundations & verification harness

Nothing user-visible. Builds the machinery that makes every later phase checkable.

- Dependencies: `date-fns-tz` (timezone math), `vitest` (logic tests),
  `@playwright/test` (screenshots), `vite-plugin-pwa` (Phase 4, added early).
- `firestore.rules` + `firebase.json` committed to the repo so the security rules
  are version-controlled instead of living in a README paste block.
- **UI harness mode** (`VITE_UI_HARNESS=1`): swaps the auth context for a fixture
  user and the Firestore layer for an in-memory fixture store. Lets the screenshot
  runner render every authenticated screen without a real Google sign-in.
- `scripts/shoot.mjs`: Playwright runner capturing every route at 1440x900
  (desktop) and 390x844 (mobile) into `screenshots/`.
- Tailwind: enforce the 4px spacing scale, typographic rhythm, and the layered
  shadow tokens from the charter.

**Exit check:** harness renders all routes; screenshots produced at both sizes.

## Phase 1 — Correctness and data safety

The app becomes trustworthy. No new features.

- **Timezone-correct dates.** Replace bare `new Date("YYYY-MM-DD")` parsing
  everywhere. Deadlines become date + time + IANA timezone, resolved to a true
  instant. Fixes deadlines silently disappearing at 05:30 IST on their due day,
  and the "Deadline Today!" that fires a day early after 18:30 IST.
- **No silent write failures.** Toast system; every Firestore call wrapped, every
  failure surfaced with a retry. Optimistic UI with rollback.
- **Archive + undo** replacing hard delete.
- **Export / import** of the complete dataset from Settings.
- **Seed default documents** — `initializeDefaultDocuments` is currently written
  but never called, so the document checklist is empty on a fresh account.
- Fix the broken `/settings` link in the application form (404s today).
- Fix the docs progress denominator corrupting when a document type is deleted,
  and the `submittedDocs` flags that linger after a doc is un-required.
- Fix the stale detail panel after editing an application.
- Fix SPA deep links (404.html redirects but index.html never decodes the result).
- Owner-only access gate.
- Loading skeletons, empty states, error states, offline state on every screen.

**Exit check:** vitest green on date/doc/stats logic; screenshots reviewed.

## Phase 2 — Data model v2, lifecycle, migration

- `profile` document: name, accent colour, home timezone, test scores,
  credential evaluations, recommenders, email templates.
- Application `stage` ladder: `not_started -> in_progress -> ready_to_send ->
  submitted -> under_review -> interview -> offer | waitlist | rejected |
  withdrawn | missed_deadline`, with `submittedAt` and `decisionAt` recorded.
- `emailed` becomes a tracked action (`sentAt`, `subject`, `replied`), so an
  application can be *in progress* and *emailed* simultaneously — impossible today.
- Lead triage states: `active | not_interested | expired | converted`.
- Migration runs once, losslessly, keeping the legacy `status` field; every
  migrated application is flagged `needsReview` and a one-time review screen asks
  the owner to set each real stage. Nothing is guessed.
- Stats corrected to count only genuinely submitted applications.

**Exit check:** migration unit-tested against fixtures of the current shape;
round-trip export/import verified; screenshots reviewed.

## Phase 3 — The trackers

- **LOR recommenders**: global recommender list, per-application status
  (not asked / asked / agreed / submitted), portal link, nudge-needed flag.
- **Fees**: amount + currency + stored INR rate, waiver requested/granted, paid
  status, running cycle total in INR.
- **Interviews**: date, time, timezone, mode, link, panel, outcome — on the dashboard.
- **Priority + fit**: dream/target/safe tier and a 1-5 fit score, sortable.
- **Universities & professors** autocomplete from prior entries; duplicate warning.
- **Test scores with expiry**: IELTS/TOEFL/Duolingo expire at 2 years, GRE at 5 —
  warn before a score dies mid-cycle. Per-application "report sent" tracking.
- **Credential evaluation** (WES/ECE) status and transcript/apostille tracking.
- **Intake cycles** so multi-cycle applying stays separable.
- **Automatic activity log**: stage changes, submissions and document ticks write
  themselves; the manual note box stays.
- **Follow-up nudges**: "21 days, no reply" computed, surfaced in Needs Attention.
- **Saved views** and **bulk actions**.
- **Cold-email templates** with merge fields and one-click filled copy.

**Exit check:** each tracker exercised in the harness fixtures; screenshots reviewed.

## Phase 4 — Realtime, offline, PWA, and the interaction pass

- Firestore realtime listeners replacing refetch-everything; offline persistence.
- Installable PWA; queued writes sync when connectivity returns.
- **Mobile floating dock navigation** replacing the hamburger drawer.
- Cmd+K global search across leads, applications, professors, notes; keyboard shortcuts.
- `.ics` calendar export of all deadlines.
- Charter sweep: every button state, every microinteraction, copy-confirmation
  pills, motion timing, `prefers-reduced-motion`, focus-visible rings, tooltips.
- Full visual hierarchy and spacing pass.

**Exit check:** Lighthouse/PWA sanity, offline behaviour verified, full screenshot
review desktop + mobile.

---

## Verification loop (run at the end of every phase)

1. `npx vitest run` — logic correctness.
2. `npm run build` — production build must succeed.
3. `node scripts/shoot.mjs` — desktop + mobile screenshots of every route and
   key modal, reviewed before proceeding.
4. Charter review against `docs/UX_CHARTER.md`.

## Open item requiring the owner

The Firestore rules and the UI gate need the exact Google account email that owns
the data. Assumed `nikhil01446@gmail.com` (from git config) — **must be confirmed
before the rules are published**, since publishing them with the wrong address
locks the owner out of their own data.
