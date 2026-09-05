# PhDBench — UX Charter

The standing UX principles this project is built against. Every phase is reviewed
against this file before it is called done. Numbers map to the original list.

---

## 1. Smart defaults that read as recommendations

Never present an empty field where a sensible value exists. Defaults must be
visibly *defaults* — changeable in one interaction, never a trap.

- Deadline time defaults to `23:59` (how universities actually write deadlines).
- Deadline timezone defaults to the university's country timezone once country is known.
- Intake defaults to the next realistic cycle (e.g. Fall 2027) based on today's date.
- Currency defaults from the university's country (US -> USD, UK -> GBP).
- New application inherits every field from its source lead — nothing retyped.
- University / professor / department inputs autocomplete from what you've entered before.
- Show defaults with a subtle "suggested" affordance, not as pre-filled noise.

## 2. Relative framing, never a bare number

(Adapted from price anchoring — this tool sells nothing, but the cognitive
principle holds: an isolated number is meaningless; a number in context informs.)

- A fee reads `$120 · 4% of your ₹2,48,000 cycle spend`, not `$120`.
- Docs read `7 of 9 ready` with the bar, not `7`.
- A deadline reads `6 days · 2 apps also due that week`, not `6d`.
- Stats compare against the user's own history, not an absolute void.

## 3. Give value before asking for input

(Adapted from reciprocity.) The app produces something useful before it demands
data entry.

- First run shows a genuinely populated example board, clearly labelled as a
  sample, that can be dismissed or kept.
- Document types are seeded automatically — the user never faces an empty
  checklist they must build before the app works.
- The dashboard surfaces insight the moment there is a single lead.

## 4. Let the user shape it (IKEA effect)

First-run setup asks for more than identity: preferred name, accent colour,
the document list they actually use, their recommenders, their test scores.
What you build yourself, you keep using.

## 5. Progress never starts at zero

Any progress indicator begins with earned momentum, honestly derived — never a
fake 20%. Creating an application *is* progress, so the readiness bar counts
the fields already captured, not only submitted documents. A bar at literal 0%
reads as failure before the user has done anything wrong.

## 6. Affordance and signifiers

The design says what a thing does; text is the fallback, not the mechanism.

- Every interactive element changes on hover and on press.
- Tooltips on every icon-only control.
- Drag handles look draggable; disabled things look disabled and say why.
- Editable text shows its editability before it is clicked.

## 7. Visual hierarchy

Size, weight, and colour carry meaning. Icons before text where an icon is
unambiguous. One primary action per view — everything else recedes.

## 8. Spacing on a 4px scale, and let it breathe

Every margin, padding and gap is a multiple of 4px (4 / 8 / 12 / 16 / 24 / 32 /
48 / 64). No arbitrary values. Generous whitespace around text blocks; scale
degrades cleanly on small screens because every value is proportional.

## 9. Typographic rhythm

- Body line-height 1.6; headings 1.15-1.25.
- Letter-spacing: negative on display sizes, positive on small caps/labels.
- Measure capped at ~68 characters for prose.

## 10. Colour with a job

Colour is a signifier, never decoration.

- Rose = urgent / destructive. Amber = attention soon. Sage = good / done.
- Sky = informational / future. Ink = neutral structure.
- A colour never appears without meaning it. Status colour is consistent in
  every surface it appears (card, badge, chart, timeline).
- Never colour alone: always paired with an icon or text for accessibility.

## 11. Layered depth

Shadow encodes elevation. Background surfaces get soft, wide, low-opacity
shadows; nested elements get tighter, stronger ones. A modal sits above a card
sits above the page, and the shadows say so. Blur used for backdrop separation.

## 12. Every state, everywhere

No control and no screen ships with only its happy path.

- Buttons: default, hover, pressed, focus-visible, disabled (with reason), loading.
- Inputs: empty, filled, focused, invalid (with the fix stated), disabled.
- Screens: loading (skeleton, not just a spinner), empty (with the next action),
  error (with a retry), offline, permission-denied, not-found.
- Every write that can fail must surface its failure. Silent failure is a bug.

## 13. Microinteractions confirm reality

Every action produces immediate, proportional feedback.

- Copy -> "Copied" pill. Save -> checkmark settle. Delete -> undo toast.
- Optimistic UI on writes, reconciled on confirm, rolled back with a message on failure.
- Motion is short (120-250ms) and eased; it explains what moved where.
- Respect `prefers-reduced-motion` everywhere.

---

## Project-specific constraints

- **No dark mode.** Light theme only, deliberately.
- **Mobile navigation is a floating dock**, not a hamburger drawer.
- **Single-user.** The app is locked to the owner's Google account.
- **International-first.** The user applies from India to universities worldwide;
  timezone, currency and score-validity correctness are functional requirements,
  not features.
