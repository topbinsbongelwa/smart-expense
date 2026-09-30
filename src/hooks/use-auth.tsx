import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'iskhwama.auth.v1';

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
  signIn: (input: Credentials) => Promise<AuthResult>;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  signOut: () => void;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DEFAULT_NAME = 'Iskhwama user';

function normaliseEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Passwords need at least 8 characters.';
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return 'Mix in at least one letter and one number.';
  }
  return null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as Partial<Account>) : null;
        if (!cancelled && parsed && typeof parsed.email === 'string') {
          setAccount({
            name: typeof parsed.name === 'string' && parsed.name.length > 0 ? parsed.name : DEFAULT_NAME,
            email: parsed.email,
            createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : Date.now(),
          });
        }
      } catch {
        // Treat unreadable storage as "signed out".
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: Account | null) => {
    setAccount(next);
    const write = next
      ? AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      : AsyncStorage.removeItem(STORAGE_KEY);
    write.catch(() => undefined);
  }, []);

  /**
   * Device-only account: the password is validated for strength and then
   * discarded. Nothing is hashed or stored until there is a real server to
   * authenticate against, and it is never written to storage or logs.
   */
  const signIn = useCallback(
    async ({ email, password }: Credentials): Promise<AuthResult> => {
      const mail = normaliseEmail(email);
      if (!EMAIL_PATTERN.test(mail)) {
        return { ok: false, message: 'That email address does not look right.' };
      }
      const passwordProblem = validatePassword(password);
      if (passwordProblem) {
        return { ok: false, message: passwordProblem };
      }
      if (account && account.email !== mail) {
        return {
          ok: false,
          message: 'No Iskhwama account on this device for that email. Create one instead.',
        };
      }

      persist(account ?? { name: DEFAULT_NAME, email: mail, createdAt: Date.now() });
      return { ok: true };
    },
    [account, persist]
  );

  const signUp = useCallback(
    async ({ name, email, password }: SignUpInput): Promise<AuthResult> => {
      const cleanName = name.trim();
      if (cleanName.length < 2) {
        return { ok: false, message: 'Tell us what to call you.' };
      }
      const mail = normaliseEmail(email);
      if (!EMAIL_PATTERN.test(mail)) {
        return { ok: false, message: 'That email address does not look right.' };
      }
      const passwordProblem = validatePassword(password);
      if (passwordProblem) {
        return { ok: false, message: passwordProblem };
      }
      if (account?.email === mail) {
        return { ok: false, message: 'You already have an account for that email. Sign in instead.' };
      }

      persist({ name: cleanName.slice(0, 24), email: mail, createdAt: Date.now() });
      return { ok: true };
    },
    [account, persist]
  );

  const signOut = useCallback(() => persist(null), [persist]);

  const value = useMemo<AuthContextValue>(
    () => ({ account, hydrated, signIn, signUp, signOut }),
    [account, hydrated, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
