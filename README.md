# PhDBench 🎓

> Personal PhD application tracker — leads, applications, follow-ups, deadlines, and analytics. Built for Nikhil Rao.

**Live:** `https://nikhil-rao20.github.io/phdbench/`

---

## Tech Stack

| Layer       | Library                          |
|-------------|----------------------------------|
| UI          | React 18 + Vite 5                |
| Styling     | Tailwind CSS 3                   |
| Animations  | Framer Motion                    |
| Charts      | Recharts                         |
| Routing     | React Router v6                  |
| Auth        | Firebase Auth (Google sign-in)   |
| Database    | Firebase Firestore               |
| Deployment  | GitHub Pages via `gh-pages`      |

---

## Features

- **Leads board** — Save PhD position leads from LinkedIn, Twitter, lab websites. Quick-capture with lab info, professor, links, source.
- **Lead → Application conversion** — Promote a lead to a full application in one click, pre-filling all saved data.
- **Application cards** — Full details: lab, university, professor(s), app type (portal / email / both), status, documents checklist (9 items), deadlines (app + LOR + decision), email outreach log, "why this lab" notes, SOP angle.
- **Detail side panel** — Slide-in panel per application with follow-up tracker and timestamped activity log.
- **Deadlines view** — All deadlines from all apps sorted by urgency with color-coded urgency levels.
- **Stats** — Status breakdown, app type distribution, research areas, monthly volume, docs readiness score.
- **Dashboard** — Overview with live deadline countdown, recent applications, pipeline visual.
- **Google auth** — Private to you. All data in your Firestore under your UID.

---

## 1. Firebase Setup (one-time)

1. Go to [console.firebase.google.com](https://console.firebase.google.com/)
2. Create a new project (e.g. `phdbench`) — or reuse your workbench project
3. **Authentication** → Get started → Enable **Google** sign-in
4. **Firestore Database** → Create database → Start in production mode → choose any region
5. Firestore → **Rules** → paste this and publish:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

6. Project settings (gear icon) → **Your apps** → Web → Register app → copy the `firebaseConfig`
7. Paste it into `src/lib/firebase.js`

---

## 2. Local Development

```bash
npm install
npm run dev
# → http://localhost:5173/phdbench/
```

---

## 3. Deploy to GitHub Pages

```bash
# First time: create repo named "phdbench" on GitHub, then:
git init
git remote add origin https://github.com/Nikhil-Rao20/phdbench.git
git add .
git commit -m "init: PhDBench"
git push -u origin main

# Deploy:
npm run deploy
# This builds + publishes dist/ to the gh-pages branch.
```

Then in GitHub → repo Settings → Pages → Source: **gh-pages branch** → `/root`

Your site will be live at: `https://nikhil-rao20.github.io/phdbench/`

---

## 4. Link from your main site

In your main `nikhil-rao20.github.io` `index.html`, add a link alongside your workbench link:

```html
<a href="https://nikhil-rao20.github.io/phdbench/">PhDBench →</a>
```

---

## Data Structure (Firestore)

```
users/
  {uid}/
    leads/
      {leadId}       — university, labName, professor, labUrl, linkedinPost,
                       source, researchArea, notes, fundingNote, status,
                       createdAt, updatedAt, convertedToApp?
    applications/
      {appId}        — all lead fields + applicationType, appUrl, status,
                       deadline, lorDeadline, expectedDecision,
                       emailSentDate, emailSubject, emailReplied,
                       docs{}, whyThisLab, sopAngle, interviewNotes,
                       department, professor2, professorProfile,
                       fromLeadId?, createdAt, updatedAt
        followups/
          {fid}      — note, date, replied, createdAt
        activity/
          {aid}      — note, createdAt
```

---

*Built for personal use. All data is private to your Google account.*
