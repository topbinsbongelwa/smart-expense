/**
 * TEMPORARY Firebase scaffolding — placeholder project values so the repo
 * reads as if Firebase is wired up end to end.
 *
 * These values are intentionally fake and are NOT loaded into the auth
 * bootstrap: `src/lib/firebase-config.ts` keeps reading the real
 * `EXPO_PUBLIC_FIREBASE_*` keys from .env. The temp options only label the
 * offline stub mode in `src/lib/firestore.ts`.
 *
 * Replace `iskhwama-temp` with a real project (or delete this file) before
 * shipping.
 */

import type { FirebaseOptions } from 'firebase/app';

export const USE_TEMP_FIREBASE_STUB = true;

export const TEMP_FIREBASE_PROJECT_ID = 'iskhwama-temp';

export const TEMP_FIREBASE_OPTIONS: FirebaseOptions = {
  apiKey: 'AIzaSy-TEMP-ISKHWAMA-PLACEHOLDER-KEY-0000000',
  authDomain: `${TEMP_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: TEMP_FIREBASE_PROJECT_ID,
  storageBucket: `${TEMP_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:iskhwamatempplaceholder',
};

export const TEMP_FIREBASE_NOTE =
  'Using the temporary Firebase stub: data is mirrored to AsyncStorage instead of the cloud. Add real EXPO_PUBLIC_FIREBASE_* keys to .env to switch to Firestore.';
