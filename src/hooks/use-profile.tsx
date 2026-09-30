import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'iskhwama.profile.v1';

export type Profile = {
  name: string;
  /** Set by the user once the app is installed, drives the greeting copy. */
  monthlyGoal: number;
};

const DEFAULT_PROFILE: Profile = {
  name: 'Iskhwama user',
  monthlyGoal: 600_000,
};

type ProfileContextValue = {
  profile: Profile;
  hydrated: boolean;
  setName: (name: string) => void;
  setMonthlyGoal: (cents: number) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as Partial<Profile>) : null;
        if (!cancelled && parsed) {
          setProfile({
            name: typeof parsed.name === 'string' ? parsed.name : DEFAULT_PROFILE.name,
            monthlyGoal:
              typeof parsed.monthlyGoal === 'number' ? parsed.monthlyGoal : DEFAULT_PROFILE.monthlyGoal,
          });
        }
      } catch {
        // Keep the defaults when storage is unavailable.
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile)).catch(() => undefined);
  }, [profile, hydrated]);

  const setName = useCallback((name: string) => {
    setProfile((current) => ({ ...current, name: name.trim().slice(0, 24) || DEFAULT_PROFILE.name }));
  }, []);

  const setMonthlyGoal = useCallback((monthlyGoal: number) => {
    setProfile((current) => ({ ...current, monthlyGoal: Math.max(0, Math.round(monthlyGoal)) }));
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({ profile, hydrated, setName, setMonthlyGoal }),
    [profile, hydrated, setName, setMonthlyGoal]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used inside <ProfileProvider>');
  return context;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'IK';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
