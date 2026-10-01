import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Keyboard-safe scroll host shared by every screen in the auth flow. */
export function AuthScreen({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Width-capped content column that clears the home indicator. */
export function AuthSheet({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.sheet,
        { backgroundColor: theme.background, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 },
      ]}>
      {children}
    </View>
  );
}

export function AuthTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const theme = useTheme();

  return (
    <View style={styles.titleBlock}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function AuthField({
  icon,
  label,
  error,
  right,
  ...rest
}: TextInputProps & { icon: IconName; label: string; error?: string; right?: ReactNode }) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.fieldBox,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: error ? theme.danger : 'transparent',
          },
        ]}>
        <Ionicons name={icon} size={18} color={error ? theme.danger : theme.textMuted} />
        <TextInput
          placeholderTextColor={theme.textMuted}
          style={[styles.fieldInput, { color: theme.text }]}
          {...rest}
        />
        {right}
      </View>
      {error ? <Text style={[styles.fieldError, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );
}

/** Banner for form errors, successes and setup notices. */
export function AuthMessage({
  tone = 'danger',
  icon = 'alert-circle',
  children,
}: {
  tone?: 'danger' | 'info' | 'success';
  icon?: IconName;
  children: ReactNode;
}) {
  const theme = useTheme();
  const color = tone === 'danger' ? theme.danger : tone === 'success' ? theme.primary : theme.textSecondary;
  const background =
    tone === 'danger' ? theme.dangerSoft : tone === 'success' ? theme.primarySoft : theme.backgroundElement;

  return (
    <View accessibilityLiveRegion="polite" style={[styles.message, { backgroundColor: background }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.messageText, { color }]}>{children}</Text>
    </View>
  );
}

export function AuthLegal({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return <Text style={[styles.legal, { color: theme.textMuted }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  titleBlock: { gap: 6, marginTop: 4 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { fontSize: 13.5, fontWeight: '500', lineHeight: 19 },
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  fieldInput: { flex: 1, fontSize: 15, fontWeight: '600' },
  fieldError: { fontSize: 12, fontWeight: '600' },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: Radius.md,
  },
  messageText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  legal: { fontSize: 11.5, fontWeight: '500', lineHeight: 17, textAlign: 'center' },
});