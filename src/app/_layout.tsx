import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  router,
  useSegments,
  type Theme,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ManusAssistant } from '@/components/manus-assistant';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ExpensesProvider, useExpenses } from '@/hooks/use-expenses';
import { ProfileProvider, useProfile } from '@/hooks/use-profile';

SplashScreen.preventAutoHideAsync();

/** The auth flow runs welcome -> signup -> login, then the app takes over. */
const AUTH_ROUTES = ['welcome', 'signup', 'login'];

function IskhwamaNavigator() {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? Colors.dark : Colors.light;
  const segments = useSegments();
  const { account, hydrated: authReady } = useAuth();
  const { hydrated: expensesReady } = useExpenses();
  const { hydrated: profileReady } = useProfile();
  const hydrated = authReady && expensesReady && profileReady;
  const onAuthScreen = AUTH_ROUTES.includes(segments[0] ?? '');

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
  }, [hydrated]);

  /** Nothing renders until the account is known, then the right screen wins. */
  useEffect(() => {
    if (!hydrated) return;
    if (!account && !onAuthScreen) {
      router.replace('/welcome');
    } else if (account && onAuthScreen) {
      router.replace('/(tabs)');
    }
  }, [hydrated, account, onAuthScreen]);

  const navigationTheme: Theme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme : DefaultTheme).colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.background,
      text: palette.text,
      border: palette.border,
      notification: palette.danger,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
        }}>
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="signup" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="login" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="expense/[id]"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
      <ManusAssistant />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ExpensesProvider>
        <ProfileProvider>
          <IskhwamaNavigator />
        </ProfileProvider>
      </ExpensesProvider>
    </AuthProvider>
  );
}