import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { BrandMark } from '@/components/brand';
import { Brand, MaxContentWidth, Radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { errorFeedback, successFeedback, tapFeedback } from '@/lib/haptics';

type Mode = 'signIn' | 'signUp';
type IconName = ComponentProps<typeof Ionicons>['name'];

function Field({
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
      {error ? (
        <Text style={[styles.fieldError, { color: theme.danger }]}>{error}</Text>
      ) : null}
    </View>
  );
}

export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === 'signUp';

  const switchMode = (next: Mode) => {
    tapFeedback();
    setMode(next);
    setError(null);
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    tapFeedback();

    const result = isSignUp ? await signUp({ name, email, password }) : await signIn({ email, password });
    setSubmitting(false);

    if (result.ok) {
      successFeedback();
      return;
    }
    errorFeedback();
    setError(result.message);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTop}>
            <BrandMark size={52} onBrand />
            <View>
              <Text style={styles.heroWordmark}>Iskhwama</Text>
              <Text style={styles.heroTagline}>Smart money, every day</Text>
            </View>
          </View>
          <Text style={styles.heroPitch}>
            See where every rand goes, and let your phone coach you through the month.
          </Text>
          <View style={styles.heroChips}>
            {['On-device', 'No bank login', 'Works offline'].map((chip) => (
              <View key={chip} style={styles.heroChip}>
                <Ionicons name="checkmark-circle" size={12} color="rgba(255,255,255,0.95)" />
                <Text style={styles.heroChipLabel}>{chip}</Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.background, paddingBottom: insets.bottom + 28 },
          ]}>
          <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
            {(
              [
                { key: 'signIn' as const, label: 'Sign in' },
                { key: 'signUp' as const, label: 'Create account' },
              ]
            ).map((option) => {
              const active = option.key === mode;
              return (
                <Pressable
                  key={option.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={option.label}
                  onPress={() => switchMode(option.key)}
                  style={({ pressed }) => [
                    styles.segmentItem,
                    active ? { backgroundColor: theme.background } : null,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}>
                  <Text
                    style={[
                      styles.segmentLabel,
                      { color: active ? theme.text : theme.textMuted },
                      active ? styles.segmentLabelActive : null,
                    ]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            {isSignUp ? 'Start your money habit' : 'Welcome back'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {isSignUp
              ? 'Two fields and you are in. No card, no verification codes.'
              : 'Sign in to pick up where you left off.'}
          </Text>

          {isSignUp ? (
            <Field
              icon="person-outline"
              label="Full name"
              value={name}
              onChangeText={setName}
              placeholder="Thandi Mokoena"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              maxLength={40}
              returnKeyType="next"
            />
          ) : null}

          <Field
            icon="mail-outline"
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            maxLength={80}
            returnKeyType="next"
          />

          <Field
            icon="lock-closed-outline"
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="8+ characters, 1 number"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            textContentType="password"
            maxLength={64}
            returnKeyType="go"
            onSubmitEditing={submit}
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                onPress={() => {
                  tapFeedback();
                  setShowPassword((current) => !current);
                }}
                hitSlop={10}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={theme.textMuted}
                />
              </Pressable>
            }
          />

          {error ? (
            <View
              accessibilityLiveRegion="polite"
              style={[styles.errorBox, { backgroundColor: theme.dangerSoft }]}>
              <Ionicons name="alert-circle" size={16} color={theme.danger} />
              <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
            </View>
          ) : null}

          <AppButton
            label={isSignUp ? 'Create my account' : 'Sign in'}
            icon={isSignUp ? 'sparkles' : 'log-in-outline'}
            size="lg"
            loading={submitting}
            onPress={submit}
          />

          <Text style={[styles.legal, { color: theme.textMuted }]}>
            Accounts are stored on this device only. Your password is checked for strength and then
            discarded — it is never saved.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: {
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 18,
    overflow: 'hidden',
    experimental_backgroundImage: Brand.gradientCard,
  },
  heroGlow: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroWordmark: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  heroTagline: { color: 'rgba(255,255,255,0.82)', fontSize: 12.5, fontWeight: '600' },
  heroPitch: {
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
    maxWidth: 380,
  },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroChipLabel: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 22,
    gap: 14,
  },
  segment: { flexDirection: 'row', padding: 4, borderRadius: Radius.pill, gap: 4 },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: Radius.pill,
  },
  segmentLabel: { fontSize: 13.5, fontWeight: '700' },
  segmentLabelActive: { fontWeight: '800' },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 },
  subtitle: { fontSize: 13.5, fontWeight: '500', lineHeight: 19, marginTop: -8 },
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: Radius.md,
  },
  errorText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  legal: { fontSize: 11.5, fontWeight: '500', lineHeight: 17, textAlign: 'center' },
});
