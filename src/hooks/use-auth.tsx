import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { describeAuthError } from '@/lib/auth-errors';
import { firebaseAuth } from '@/lib/firebase';
import { FIREBASE_SETUP_MESSAGE, isFirebaseConfigured } from '@/lib/firebase-config';
import { isValidEmail, normaliseEmail, validatePassword } from '@/lib/validation';

export type Account = {
  name: string;
  email: string;
  createdAt: number;
};

export type AuthResult = { ok: true } | { ok: false; message: string };

type Credentials = { email: string; password: string };
type SignUpInput = Credentials & { name: string };

type AuthContextValue = {
  account: Account | null;
  hydrated: boolean;
  /** False until a Firebase web config is present in .env. */
  configured: boolean;
  signIn: (input: Credentials) => Promise<AuthResult>;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  /** Renames the account in Firebase so the name follows the user across devices. */
  updateName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
};

function toAccount(user: User): Account {
  return {
    name: user.displayName?.trim() || user.email?.split('@')[0] || 'Iskhwama user',
    email: user.email ?? '',
    createdAt: user.metadata.creationTime ? Date.parse(user.metadata.creationTime) : Date.now(),
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  // Without a config there is no session to wait for, so treat it as resolved.
  const [hydrated, setHydrated] = useState(!isFirebaseConfigured);

  useEffect(() => {
    if (!firebaseAuth) return;
    return onAuthStateChanged(firebaseAuth, (user) => {
      setAccount(user ? toAccount(user) : null);
      setHydrated(true);
    });
  }, []);

  const signUp = useCallback(async ({ name, email, password }: SignUpInput): Promise<AuthResult> => {
    if (!firebaseAuth) return { ok: false, message: FIREBASE_SETUP_MESSAGE };

    const cleanName = name.trim();
    if (cleanName.length < 2) return { ok: false, message: 'Tell us what to call you.' };
    const mail = normaliseEmail(email);
    if (!isValidEmail(mail)) {
      return { ok: false, message: 'That email address does not look right.' };
    }
    const passwordProblem = validatePassword(password);
    if (passwordProblem) return { ok: false, message: passwordProblem };

    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, mail, password);
      await updateProfile(credential.user, { displayName: cleanName.slice(0, 24) });
      // The auth listener does not re-fire for a profile update, so mirror it here.
      setAccount(toAccount(credential.user));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: describeAuthError(error, 'Could not create that account. Try again.') };
    }
  }, []);

  const signIn = useCallback(async ({ email, password }: Credentials): Promise<AuthResult> => {
    if (!firebaseAuth) return { ok: false, message: FIREBASE_SETUP_MESSAGE };

    const mail = normaliseEmail(email);
    if (!isValidEmail(mail)) {
      return { ok: false, message: 'That email address does not look right.' };
    }
    if (password.length === 0) return { ok: false, message: 'Add your password.' };

    try {
      await signInWithEmailAndPassword(firebaseAuth, mail, password);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: describeAuthError(error, 'Could not sign you in. Try again.') };
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    if (!firebaseAuth) return { ok: false, message: FIREBASE_SETUP_MESSAGE };

    const mail = normaliseEmail(email);
    if (!isValidEmail(mail)) {
      return { ok: false, message: 'Add the email address on your account.' };
    }

    try {
      await sendPasswordResetEmail(firebaseAuth, mail);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: describeAuthError(error, 'Could not send that email. Try again.') };
    }
  }, []);

  const updateName = useCallback(async (name: string) => {
    const clean = name.trim().slice(0, 24);
    if (!firebaseAuth?.currentUser || clean.length < 2) return;
    try {
      await updateProfile(firebaseAuth.currentUser, { displayName: clean });
      setAccount(toAccount(firebaseAuth.currentUser));
    } catch {
      // The local name still applies, so a failed sync is not worth interrupting for.
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!firebaseAuth) return;
    try {
      await firebaseSignOut(firebaseAuth);
    } catch {
      // The listener drives the redirect either way.
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      account,
      hydrated,
      configured: isFirebaseConfigured,
      signIn,
      signUp,
      sendPasswordReset,
      updateName,
      signOut,
    }),
    [account, hydrated, signIn, signUp, sendPasswordReset, updateName, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}