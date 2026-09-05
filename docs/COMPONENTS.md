# Component library decisions

React Bits / Magic UI / Kokonut UI are **copy-in source** libraries (shadcn-style),
not npm dependencies. Each component is vendored into `src/components/vendor/`
with its origin recorded, so we own the code and can adapt it to the charter.

Selection rule, from `docs/UX_CHARTER.md` #10 and #13: motion and ornament must do
a job. A component that only decorates costs bundle size and attention for nothing.

---

## Adopted — each earns its place

| Component | Source | Where it's used | Why |
|---|---|---|---|
| **Dock** | React Bits | Mobile navigation | Exactly the floating dock you asked for; replaces the hamburger drawer |
| **Stepper** | React Bits | First-run onboarding, migration review screen | Charter #4 (IKEA effect) and #5 (momentum) — a multi-step setup the user shapes |
| **Fuzzy Text** | React Bits | 404 / error pages | Charter #12 — error screens deserve real design, not a bare string |
| **Click Spark** | React Bits | Global pointer feedback | Charter #13 — confirms every tap landed |
| **Ripple Button** | Magic UI | Primary actions | Charter #12/#13 — press state you can feel |
| **Interactive Hover Button** | Magic UI | Key CTAs (Add application, Convert lead) | Charter #6 — affordance made obvious |
| **Gooey Nav** | React Bits | Desktop sidebar active-state, filter tabs | Makes the active view unmistakable (charter #7) |
| **Magnet Lines** | React Bits | Login page background | Replaces the hand-rolled particle canvas with something lighter and more deliberate |
| **Profile Dropdown** | Kokonut UI | Sidebar user block; profile button in the mobile dock | The sidebar currently shows a static avatar and email that do nothing. A dropdown gives profile, settings, export-backup and sign-out a proper home, and gives the avatar an affordance (charter #6) |

## Adopted with modification

| Component | Change |
|---|---|
| **Chroma Grid** | Colour-on-hover behaviour reused for professor/lab cards, but the greyscale default is dropped — status colour must always be visible (charter #10) |
| **Scroll Float** | Used only on the login page. Inside the app, content that animates on every scroll fights the data (charter #7) |

## Rejected — with reasons

| Component | Why not |
|---|---|
| **Animated Theme Toggler** | You asked for no dark mode. A toggle with one state is a broken affordance (charter #6) |
| **Lanyard** (hanging ID card) | Needs `three.js` + `@react-three/fiber` + `rapier` physics — roughly 600KB+ for one decorative card. Disproportionate in a tool whose job is speed. **Say the word and I'll add it to the Settings profile page** — it would look great there, it's purely a cost call |
| **Glyph Matrix** | Heavy animated background; the login page already gets Magnet Lines. Two backgrounds compete |
| **Logo Loop** | A scrolling strip of university logos suits a marketing page. This app has no marketing surface, and using real university marks raises trademark questions |
| **Masonry gallery** | Application cards need a scannable, comparable grid. Ragged masonry actively harms comparison (charter #7) |
| **Cursor Grid** | Overlaps with Magnet Lines; picking both means neither reads as intentional |

---

## Dependency cost

Adopted components need only what the project already has (`framer-motion`,
Tailwind) plus `clsx` + `tailwind-merge` for Magic UI's class handling. No GSAP,
no three.js, no physics engine.
