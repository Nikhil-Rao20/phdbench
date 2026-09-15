# Things only you can do

I'll keep this list current while I build. Nothing here blocks me — I'm
carrying on regardless — but these are the steps that need your hands.

## Before the new version goes live

- [x] **Export a backup.** Done — `phdbench-backup-2026-09-15.json`
      (22 leads, 7 applications, 9 documents). It's gitignored, so it will
      never reach the public repo.

- [ ] **Publish the new Firestore rules.** Console → phdbench → Firestore
      Database → Rules → paste `firestore.rules` → Publish.
      Do NOT do this until I say the app code is deployed, or the live site
      will break: the new rules require an approval record that the current
      deployed code doesn't create.

- [ ] **Create the Firestore indexes.** I'll generate `firestore.indexes.json`.
      Either paste them in the console or let Firebase prompt you — when a
      query needs an index, the browser console prints a direct link that
      creates it in one click.

## Worth doing once it's live

- [ ] **Test the rules in the Rules Playground.** Console → Firestore → Rules →
      Rules Playground. I can't run the emulator here (it needs Java, which
      isn't installed on this machine), so this is the one security layer I
      cannot execute myself. I'll give you exact cases to paste in.

- [ ] **Approve your two friends.** They sign in, fill the request form, you
      approve from the admin panel. Their emails never touch the repo.

## Only if you decide to open it up widely

- [ ] **Firebase Blaze plan + budget cap.** Not needed while access is
      approval-gated — you should stay comfortably inside the free tier.
      Required only if you ever remove the approval gate.
