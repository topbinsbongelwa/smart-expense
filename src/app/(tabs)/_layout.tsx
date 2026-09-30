import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorToast } from '@/components/error-toast';
import { Brand, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorFeedback, tapFeedback } from '@/lib/haptics';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: 'wallet', inactive: 'wallet-outline' },
  stats: { active: 'stats-chart', inactive: 'stats-chart-outline' },
  calendar: { active: 'calendar', inactive: 'calendar-outline' },
  insights: { active: 'sparkles', inactive: 'sparkles-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

/**
 * Today's slice of the build is Home and AI. The other tabs stay visible so the
 * shape of the app is obvious, but pressing one raises an error instead of
 * opening a half-finished screen.
 */
const LOCKED: Record<string, string> = {
  stats: 'Stats is still on the drawing board. Today we ship Home and AI.',
  calendar: 'Calendar has not been built yet. Today we ship Home and AI.',
  profile: 'Profile comes later. Today we ship Home and AI.',
};

function lockedMessage(target: string): string | null {
  if (LOCKED[target]) return LOCKED[target];
  const leaf = target.replace(/^\.?\//, '').split('/').pop() ?? target;
  return LOCKED[leaf] ?? null;
}

function renderIcon(routeName: string) {
  const icons = TAB_ICONS[routeName] ?? TAB_ICONS.index;
  const locked = routeName in LOCKED;
  function TabBarIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    const theme = useTheme();
    const glyph = (
      <Ionicons name={focused ? icons.active : icons.inactive} size={21} color={color as string} />
    );

    if (!locked) return glyph;

    return (
      <View style={styles.lockedIcon}>
        {glyph}
        <View style={[styles.lockBadge, { backgroundColor: theme.textMuted }]}>
          <Ionicons name="lock-closed" size={8} color={theme.background} />
        </View>
      </View>
    );
  }
  return TabBarIcon;
}

const BOTTOM_HEIGHT = 62;
const SIDEBAR_WIDTH = 104;

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const bottomInset = isWide ? 0 : Math.max(insets.bottom, 10);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Tabs
        screenListeners={{
          tabPress: (event) => {
            const message = lockedMessage(event.target ?? '');
            if (message) {
              event.preventDefault();
              errorFeedback();
              setError(message);
              return;
            }
            tapFeedback();
          },
        }}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.background },
          tabBarActiveTintColor: isWide ? theme.onPrimarySoft : Brand.green,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarActiveBackgroundColor: isWide ? Brand.green : theme.primarySoft,
          tabBarHideOnKeyboard: true,
          tabBarPosition: isWide ? 'left' : 'bottom',
          tabBarVariant: isWide ? 'material' : 'uikit',
          tabBarItemStyle: {
            borderRadius: Radius.md,
            marginHorizontal: isWide ? 10 : 3,
            marginVertical: 2,
          },
          tabBarLabelStyle: {
            fontSize: 10.5,
            fontWeight: '700',
            letterSpacing: 0.1,
          },
          tabBarStyle: isWide
            ? {
                width: SIDEBAR_WIDTH,
                backgroundColor: theme.background,
                borderRightWidth: StyleSheet.hairlineWidth,
                borderRightColor: theme.border,
                paddingTop: 18,
              }
            : {
                height: BOTTOM_HEIGHT + bottomInset,
                paddingTop: 8,
                paddingBottom: bottomInset,
                backgroundColor: theme.background,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.border,
                shadowColor: theme.shadow,
                shadowOpacity: 0.08,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: -6 },
                elevation: 12,
              },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: renderIcon('index') }} />
        <Tabs.Screen name="stats" options={{ title: 'Stats', tabBarIcon: renderIcon('stats') }} />
        <Tabs.Screen
          name="calendar"
          options={{ title: 'Calendar', tabBarIcon: renderIcon('calendar') }}
        />
        <Tabs.Screen name="insights" options={{ title: 'AI', tabBarIcon: renderIcon('insights') }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: renderIcon('profile') }} />
      </Tabs>

      <ErrorToast
        message={error}
        onDismiss={() => setError(null)}
        bottom={isWide ? 24 : BOTTOM_HEIGHT + bottomInset + 14}
      />
    </>
  );
}

const styles = StyleSheet.create({
  lockedIcon: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    right: -5,
    width: 13,
    height: 13,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
