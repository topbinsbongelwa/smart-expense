/**
 * Firebase project config, shared by the native and web bootstraps.
 *
 * Credentials come from `EXPO_PUBLIC_FIREBASE_*` env vars (see `.env.example`).
 * A Firebase web config is a public identifier rather than a secret, so it is safe
 * to inline in the bundle.
 */

import type { FirebaseOptions } from 'firebase/app';

export const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/** Call sites check this before touching auth so a missing .env explains itself. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

export const FIREBASE_SETUP_MESSAGE =
  'Accounts are not connected yet. Add your Firebase web config to .env, then restart the dev server.';