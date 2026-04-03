// src/lib/firebase.js
// ────────────────────────────────────────────────────────────────
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project called "phdbench" (or reuse your workbench project)
// 3. Add a Web App → copy the firebaseConfig object below
// 4. Enable Authentication → Google sign-in
// 5. Enable Firestore Database → start in production mode
// 6. In Firestore Rules, paste:
//    rules_version = '2';
//    service cloud.firestore {
//      match /databases/{database}/documents {
//        match /users/{userId}/{document=**} {
//          allow read, write: if request.auth != null && request.auth.uid == userId;
//        }
//      }
//    }
// ────────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDiUw-VOm6izK6mZuxEgE3LNgYlDvHuTJY",
  authDomain: "phdbench.firebaseapp.com",
  projectId: "phdbench",
  storageBucket: "phdbench.firebasestorage.app",
  messagingSenderId: "133283058963",
  appId: "1:133283058963:web:4ef1cfa66dd0d72f06f6e6",
  measurementId: "G-ZJ7GMM8D25"
};

const app      = initializeApp(firebaseConfig)
export const auth     = getAuth(app)
export const db       = getFirestore(app)
export const provider = new GoogleAuthProvider()
