/**
 * Firebase bootstrap for iOS and Android.
 *
 * Uses the JS SDK so the app keeps running in Expo Go, with AsyncStorage wired up
 * as the session store. The web build lives in `firebase.web.ts`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';

import { firebaseConfig, isFirebaseConfigured } from '@/lib/firebase-config';

/**
 * Initialised once per JS context. Fast Refresh can re-run this module, so both
 * steps have to tolerate being called again on an already-initialised app.
 */
function resolveApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

function resolveAuth(app: FirebaseApp): Auth {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Already initialised on this app, so the session survives the reload.
    return getAuth(app);
  }
}

const app = resolveApp();

export const firebaseApp = app;
export const firebaseAuth: Auth | null = app ? resolveAuth(app) : null;