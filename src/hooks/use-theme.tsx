/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

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
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

type ThemeMode = 'system' | 'light' | 'dark';
type ThemePreference = {
  scheme: 'light' | 'dark';
  toggleTheme: () => void;
};

const STORAGE_KEY = 'iskhwama.theme.v1';
const ThemePreferenceContext = createContext<ThemePreference | null>(null);

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((storedMode) => {
        if (cancelled) return;
        if (storedMode === 'light' || storedMode === 'dark' || storedMode === 'system') {
          setMode(storedMode);
        }
      })
      .catch((error: unknown) => {
        console.error('Unable to load the saved theme preference.', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const scheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const toggleTheme = useCallback(() => {
    const nextMode = scheme === 'dark' ? 'light' : 'dark';
    setMode(nextMode);
    AsyncStorage.setItem(STORAGE_KEY, nextMode).catch((error: unknown) => {
      console.error('Unable to save the theme preference.', error);
    });
  }, [scheme]);

  const value = useMemo(() => ({ scheme, toggleTheme }), [scheme, toggleTheme]);

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);
  if (!context) throw new Error('useThemePreference must be used inside <ThemePreferenceProvider>');
  return context;
}

export function useTheme() {
  const { scheme } = useThemePreference();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}