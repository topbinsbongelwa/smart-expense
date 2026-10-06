/**
 * Firestore data layer.
 *
 * Two modes, resolved on every call:
 *  - `cloud` — a real Firebase project is configured in .env, so writes go to
 *    `users/{uid}/expenses|profile` (guarded by firestore.rules).
 *  - `stub`  — the temporary scaffolding from `firebase-dummy-config.ts`:
 *    writes mirror to AsyncStorage under `iskhwama.firestore.*` keys so the
 *    app behaves as if sync is happening without a real project.
 *
 * Every export is fire-and-forget safe: they never throw, and AsyncStorage
 * remains the source of truth for the app itself.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getFirestore, setDoc } from 'firebase/firestore';

import type { Expense } from '@/constants/categories';
import { isFirebaseConfigured } from '@/lib/firebase-config';
import { USE_TEMP_FIREBASE_STUB, TEMP_FIREBASE_PROJECT_ID } from '@/lib/firebase-dummy-config';
import { firebaseApp, firebaseAuth } from '@/lib/firebase';

export type SyncMode = 'cloud' | 'stub';

const EXPENSES_STUB_KEY = 'iskhwama.firestore.expenses.v1';
const PROFILE_STUB_KEY = 'iskhwama.firestore.profile.v1';

type ProfileSnapshot = { name: string; monthlyGoal: number };

/** Which backing store the current build writes to. */
export function firestoreSyncMode(): SyncMode {
  return isFirebaseConfigured && firebaseApp ? 'cloud' : 'stub';
}

function stubEnabled(): boolean {
  return USE_TEMP_FIREBASE_STUB && !isFirebaseConfigured;
}

async function writeCloud(path: string, uid: string, payload: unknown): Promise<void> {
  if (!firebaseApp) return;
  const db = getFirestore(firebaseApp);
  await setDoc(doc(db, 'users', uid, path, 'latest'), {
    data: payload,
    projectId: TEMP_FIREBASE_PROJECT_ID,
    updatedAt: Date.now(),
  });
}

async function writeStub(key: string, payload: unknown): Promise<void> {
  await AsyncStorage.setItem(
    key,
    JSON.stringify({ data: payload, updatedAt: Date.now(), mode: 'stub' })
  );
}

/** Mirrors the expense list to Firestore (or the temp stub). Best effort. */
export async function saveExpenses(expenses: Expense[]): Promise<void> {
  try {
    if (firestoreSyncMode() === 'cloud') {
      const uid = firebaseAuth?.currentUser?.uid;
      if (!uid) return;
      await writeCloud('expenses', uid, expenses);
    } else if (stubEnabled()) {
      await writeStub(EXPENSES_STUB_KEY, expenses);
    }
  } catch {
    // Sync is opportunistic — local data already saved by the caller.
  }
}

/** Mirrors the profile document to Firestore (or the temp stub). Best effort. */
export async function saveProfile(profile: ProfileSnapshot): Promise<void> {
  try {
    if (firestoreSyncMode() === 'cloud') {
      const uid = firebaseAuth?.currentUser?.uid;
      if (!uid) return;
      await writeCloud('profile', uid, profile);
    } else if (stubEnabled()) {
      await writeStub(PROFILE_STUB_KEY, profile);
    }
  } catch {
    // Sync is opportunistic — local data already saved by the caller.
  }
}
