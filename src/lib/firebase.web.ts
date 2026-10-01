/**
 * Firebase bootstrap for web.
 *
 * `getReactNativePersistence` only exists in the React Native build of the auth
 * package, so browsers use the default persistence that `getAuth` picks up.
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

import { firebaseConfig, isFirebaseConfigured } from '@/lib/firebase-config';

function resolveApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

const app = resolveApp();

export const firebaseApp = app;
export const firebaseAuth: Auth | null = app ? getAuth(app) : null;