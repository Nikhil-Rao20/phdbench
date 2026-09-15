# Things only you can do

Nothing here blocks me — I'm carrying on regardless. These are the steps that
need your hands, in the order they need doing.

---

## 1. Before the new version goes live

- [x] **Export a backup.** Done — `phdbench-backup-2026-09-15.json`
      (22 leads, 7 applications, 9 documents). It is gitignored, so it can never
      reach the public repo. I've dry-run the migration against it: 22 leads
      convert to 14 active / 7 already-applied / 1 ruled out, with all 12 notes
      and all 17 deadlines intact.

- [ ] **Deploy the app code first, then publish the rules.**
      Order matters. The new rules require an approval record that the currently
      deployed code does not create — publish them first and you lock yourself
      out until the new code ships.

      1. `git push origin main` (deploys via Actions, ~2 min)
      2. Then publish the rules, below.

- [ ] **Publish the Firestore rules.**
      Console → **phdbench** → Firestore Database → **Rules** → paste the whole
      of `firestore.rules` → **Publish**.

      Sanity check before publishing: `adminEmail()` must read
      `nikhil01446@gmail.com`. That is the one value that, if wrong, locks you
      out of your own data at the database layer.

- [ ] **Create the composite index.**
      Console → Firestore → **Indexes** → Composite → Add:

      | Collection | Field | Type |
      |---|---|---|
      | `groups` | `memberEmails` | Array contains |
      | `groups` | `createdAt` | Ascending |

      It is also in `firestore.indexes.json`. Without it, loading your groups
      fails outright — not slowly, but with an error. Firebase will also print a
      one-click link in the browser console the first time the query runs, which
      is usually the easiest route.

---

## 2. First run, in this order

- [ ] **Sign in.** You are the admin, so you skip the request queue entirely.
- [ ] **Create a group** (Groups → New group). Name it whatever you like —
      "RGUKT PhD hunt" or similar.
- [ ] **Copy your leads across.** Settings → the blue *Move your leads to a
      shared board* panel → it shows you exactly what it will do, then copies.
      Safe to run twice; it skips anything already copied.
- [ ] **Check the board.** Your 7 already-applied leads should show as applied
      for you, and your 14 active ones as active. Your applications should be
      exactly as they were.
- [ ] **Export a fresh backup** once you are satisfied.

---

## 3. Bringing your friends in

- [ ] Send them the link. They sign in and fill the request form.
- [ ] Approve them: sidebar → **Access** → Approve.
- [ ] Invite them to your group: **Groups** → Invite someone → their email.

Two separate steps on purpose — approving grants a private workspace, inviting
adds them to a board. Someone can be approved without being in any of your
groups.

---

## 4. Security check I cannot run myself

- [ ] **Test the rules in the Rules Playground.**
      Console → Firestore → Rules → **Rules Playground**. The Firestore emulator
      needs Java, which is not installed on this machine, so this is the one
      layer I cannot execute. Worth running these four:

      | Simulate | Expect |
      |---|---|
      | Read `/users/<some other uid>/applications/x` as yourself | **Denied** |
      | Create `/accessRequests/<your uid>` with `status: "approved"` | **Denied** |
      | Read `/groups/<a group you are not in>` | **Denied** |
      | Read `/users/<your uid>/applications/x` as yourself | **Allowed** |

      The first two are the ones that matter: they are the attacks a malicious
      approved user would actually try.

---

## 5. Right after the first deploy — 30 seconds

- [ ] **Open the browser console (F12) and look for red CSP errors.**
      I added a Content Security Policy, which restricts what the page may load
      and connect to. It is the single best defence against an injected script,
      but it is also the change most likely to block something legitimate, and I
      cannot test it against live Firebase from here — the harness runs without a
      real Firestore connection.

      If you see `Refused to connect to …` or `Refused to load …`, copy the line
      and send it to me; it is a one-word fix to the policy in `index.html`.
      If sign-in works and your leads appear, it is fine.

---

## 6. Only if you ever remove the approval gate

- [ ] **Firebase Blaze plan + budget cap.** Not needed while access is approved
      by hand — you should stay comfortably inside the free tier. Required only
      if you open signup to everyone.
