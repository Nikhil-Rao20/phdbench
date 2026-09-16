# Things only you can do

## Deployment — done, 16 Sep 2026

- [x] Export a backup before touching anything
- [x] Deploy the app code (Actions)
- [x] Publish `firestore.rules` — admin address verified
- [x] Create the `groups` composite index
- [x] Sign in and confirm the data
- [x] Create a group and copy the leads onto the shared board
- [x] Export a fresh backup — `phdbench-backup-2026-09-16 (1).json`,
      formatVersion 3, the first one containing the shared board
- [x] Rules Playground: cross-account read denied, self-approval denied,
      foreign group denied, own data allowed

Live and verified.

---

## When you want your friends on it

1. Send them https://nikhil-rao20.github.io/phdbench/
2. They sign in and fill the request form
3. You approve: sidebar → **Access** → Approve
4. Invite them to the board: **Groups** → Invite someone → their email

Two separate steps on purpose. Approving gives someone their own private
workspace; inviting puts them on your board. Somebody can be approved without
being in any of your groups.

---

## Keep doing

- **Export a backup every few weeks.** Settings → Export everything. The app
  nags after 30 days. Firestore's free plan has no automated backup, so that
  file is the only thing standing between you and total loss.
- Keep the backup files out of the repo. They are gitignored already.

---

## Known, deliberate

- **Harvard and Stanford** read Active on the board though you have
  applications for them. You said you would fix those two by hand.
- **Drive links are empty** on all 7 applications. Unused, not lost.
- **Per-account caps** (500 leads, 500 applications) are enforced in the
  interface and bounded in the rules by document shape and ownership, but the
  rules do not count documents. Since access is granted by hand, the exposure is
  an approved user deliberately exceeding their quota — visible and reversible.
- **You are exempt from every cap.**

---

## Only if you ever remove the approval gate

- [ ] Firebase Blaze plan with a budget cap. Not needed while access is approved
      by hand — you should stay comfortably inside the free tier.
