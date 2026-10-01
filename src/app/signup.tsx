import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AuthField, AuthLegal, AuthMessage, AuthScreen, AuthSheet, AuthTitle } from '@/components/auth-screen';
import { BrandMark } from '@/components/brand';
import { Radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { errorFeedback, successFeedback, tapFeedback } from '@/lib/haptics';
import { isValidEmail, validatePassword } from '@/lib/validation';

type FieldName = 'name' | 'email' | 'password' | 'confirm';
type FieldErrors = Partial<Record<FieldName, string>>;

const PASSWORD_RULES = [
  { label: '8+ characters', test: (value: string) => value.length >= 8 },
  { label: 'A letter', test: (value: string) => /[a-zA-Z]/.test(value) },
  { label: 'A number', test: (value: string) => /\d/.test(value) },
];

export default function SignUpScreen() {
  const theme = useTheme();
  const { signUp, configured } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState({ password: false, confirm: false });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const clearError = (field: FieldName) => {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
    setFormError(null);
  };

  const toggleVisible = (field: 'password' | 'confirm') => {
    tapFeedback();
    setVisible((current) => ({ ...current, [field]: !current[field] }));
  };

  const submit = async () => {
    if (submitting) return;

    const next: FieldErrors = {};
    if (name.trim().length < 2) next.name = 'Tell us what to call you.';
    if (!isValidEmail(email)) next.email = 'That email address does not look right.';
    const passwordProblem = validatePassword(password);
    if (passwordProblem) next.password = passwordProblem;
    if (confirm !== password) next.confirm = 'Passwords do not match.';

    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      errorFeedback();
      return;
    }

    setSubmitting(true);
    setFormError(null);
    tapFeedback();

    const result = await signUp({ name, email, password });
    setSubmitting(false);

    if (result.ok) {
      // The root layout swaps to the app as soon as the session lands.
      successFeedback();
      return;
    }

    errorFeedback();
    setFormError(result.message);
  };

  return (
    <AuthScreen>
      <AuthSheet>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={10}
            onPress={() => {
              tapFeedback();
              router.replace('/welcome');
            }}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.6 : 1 },
            ]}>
            <Ionicons name="chevron-back" size={18} color={theme.text} />
          </Pressable>
          <BrandMark size={36} />
        </View>

        <AuthTitle
          title="Start your money habit"
          subtitle="Three fields and you are in. No card, no verification codes."
        />

        <AuthField
          icon="person-outline"
          label="Full name"
          value={name}
          onChangeText={(value) => {
            setName(value);
            clearError('name');
          }}
          placeholder="Thandi Mokoena"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          maxLength={40}
          returnKeyType="next"
          error={errors.name}
        />

        <AuthField
          icon="mail-outline"
          label="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            clearError('email');
          }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          maxLength={80}
          returnKeyType="next"
          error={errors.email}
        />

        <View style={styles.passwordBlock}>
          <AuthField
            icon="lock-closed-outline"
            label="Password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              // The confirm box is stale the moment the password changes.
              if (confirm) {
                setConfirm('');
                clearError('confirm');
              }
              clearError('password');
            }}
            placeholder="8+ characters, 1 number"
            secureTextEntry={!visible.password}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            maxLength={64}
            returnKeyType="next"
            error={errors.password}
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={visible.password ? 'Hide password' : 'Show password'}
                hitSlop={10}
                onPress={() => toggleVisible('password')}>
                <Ionicons
                  name={visible.password ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={theme.textMuted}
                />
              </Pressable>
            }
          />
          <View style={styles.rules}>
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(password);
              return (
                <View key={rule.label} style={styles.rule}>
                  <Ionicons
                    name={met ? 'checkmark-circle' : 'ellipse-outline'}
                    size={12}
                    color={met ? theme.primary : theme.textMuted}
                  />
                  <Text style={[styles.ruleLabel, { color: met ? theme.primary : theme.textMuted }]}>
                    {rule.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <AuthField
          icon="checkmark-circle-outline"
          label="Confirm password"
          value={confirm}
          onChangeText={(value) => {
            setConfirm(value);
            clearError('confirm');
          }}
          placeholder="Type it once more"
          secureTextEntry={!visible.confirm}
          autoCapitalize="none"
          autoComplete="off"
          textContentType="newPassword"
          maxLength={64}
          returnKeyType="go"
          onSubmitEditing={submit}
          error={errors.confirm}
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visible.confirm ? 'Hide password' : 'Show password'}
              hitSlop={10}
              onPress={() => toggleVisible('confirm')}>
              <Ionicons
                name={visible.confirm ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={theme.textMuted}
              />
            </Pressable>
          }
        />

        {configured ? null : (
          <AuthMessage tone="info" icon="construct-outline">
            Accounts are not connected yet, so signing up will not stick. Add your Firebase web config
            to .env and restart.
          </AuthMessage>
        )}

        {formError ? (
          <AuthMessage tone="danger" icon="alert-circle">
            {formError}
          </AuthMessage>
        ) : null}

        <AppButton
          label="Create my account"
          icon="sparkles"
          size="lg"
          loading={submitting}
          onPress={submit}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in to an existing account"
          onPress={() => {
            tapFeedback();
            router.replace('/login');
          }}
          style={({ pressed }) => [styles.switch, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[styles.switchLabel, { color: theme.textSecondary }]}>
            Already have an account?
          </Text>
          <Text style={[styles.switchAction, { color: theme.primary }]}>Sign in</Text>
        </Pressable>

        <AuthLegal>
          By creating an account you agree to Iskhwama storing your expenses on this device. Your
          sign-in is handled by Firebase and never leaves it.
        </AuthLegal>
      </AuthSheet>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordBlock: { gap: 8 },
  rules: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ruleLabel: { fontSize: 11.5, fontWeight: '700' },
  switch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  switchLabel: { fontSize: 13.5, fontWeight: '600' },
  switchAction: { fontSize: 13.5, fontWeight: '800' },
});