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
import { FIREBASE_SETUP_MESSAGE } from '@/lib/firebase-config';
import { isValidEmail } from '@/lib/validation';

type FieldErrors = { email?: string; password?: string };
type Notice = { tone: 'success' | 'danger'; text: string };

export default function LoginScreen() {
  const theme = useTheme();
  const { signIn, sendPasswordReset, configured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;

    const next: FieldErrors = {};
    if (!isValidEmail(email)) next.email = 'That email address does not look right.';
    if (password.length === 0) next.password = 'Add your password.';

    setErrors(next);
    if (next.email || next.password) {
      errorFeedback();
      return;
    }

    setSubmitting(true);
    setNotice(null);
    tapFeedback();

    const result = await signIn({ email, password });
    setSubmitting(false);

    if (result.ok) {
      // The root layout swaps to the app as soon as the session lands.
      successFeedback();
      return;
    }

    errorFeedback();
    setNotice({ tone: 'danger', text: result.message });
  };

  const reset = async () => {
    if (submitting) return;
    setNotice(null);
    setErrors({});

    if (!isValidEmail(email)) {
      setErrors({ email: 'Add your email so we know where to send it.' });
      errorFeedback();
      return;
    }

    setSubmitting(true);
    const result = await sendPasswordReset(email);
    setSubmitting(false);

    if (result.ok) {
      successFeedback();
      setNotice({
        tone: 'success',
        text: `If an account exists for ${email.trim().toLowerCase()}, a reset link is on its way.`,
      });
      return;
    }

    errorFeedback();
    setNotice({ tone: 'danger', text: result.message });
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
          title="Welcome back"
          subtitle="Sign in to pick up where you left off."
        />

        <AuthField
          icon="mail-outline"
          label="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setErrors((current) => ({ ...current, email: undefined }));
            setNotice(null);
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

        <AuthField
          icon="lock-closed-outline"
          label="Password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: undefined }));
            setNotice(null);
          }}
          placeholder="Your password"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          maxLength={64}
          returnKeyType="go"
          onSubmitEditing={submit}
          error={errors.password}
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              hitSlop={10}
              onPress={() => {
                tapFeedback();
                setShowPassword((current) => !current);
              }}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={theme.textMuted}
              />
            </Pressable>
          }
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Forgot password"
          onPress={() => {
            tapFeedback();
            void reset();
          }}
          style={({ pressed }) => [styles.forgot, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[styles.forgotLabel, { color: theme.primary }]}>Forgot password?</Text>
        </Pressable>

        {notice ? (
          <AuthMessage tone={notice.tone} icon="information-circle-outline">
            {notice.text}
          </AuthMessage>
        ) : null}

        {configured ? null : (
          <AuthMessage tone="info" icon="construct-outline">
            {FIREBASE_SETUP_MESSAGE}
          </AuthMessage>
        )}

        <AppButton
          label="Sign in"
          icon="log-in-outline"
          size="lg"
          loading={submitting}
          onPress={submit}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a new account"
          onPress={() => {
            tapFeedback();
            router.replace('/signup');
          }}
          style={({ pressed }) => [styles.switch, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[styles.switchLabel, { color: theme.textSecondary }]}>New to Iskhwama?</Text>
          <Text style={[styles.switchAction, { color: theme.primary }]}>Create account</Text>
        </Pressable>

        <AuthLegal>
          Your sign-in is handled by Firebase. Iskhwama never sees or stores your password.
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
  forgot: { alignSelf: 'flex-end', marginTop: -6 },
  forgotLabel: { fontSize: 13, fontWeight: '700' },
  switch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  switchLabel: { fontSize: 13.5, fontWeight: '600' },
  switchAction: { fontSize: 13.5, fontWeight: '800' },
});