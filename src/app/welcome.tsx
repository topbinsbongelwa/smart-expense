import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AuthLegal, AuthMessage, AuthScreen, AuthSheet, AuthTitle } from '@/components/auth-screen';
import { BrandMark } from '@/components/brand';
import { Brand, Radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { tapFeedback } from '@/lib/haptics';

type IconName = ComponentProps<typeof Ionicons>['name'];

const PERKS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'scan-outline',
    title: 'Log a spend in seconds',
    body: 'Tap, type, done. Iskhwama files it and files it away.',
  },
  {
    icon: 'sparkles-outline',
    title: 'Get called out kindly',
    body: 'Duplicates, subscriptions and odd days get flagged before they bite.',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Yours, on your phone',
    body: 'No bank logins. Your account is secured by Firebase, your data stays put.',
  },
];

export default function WelcomeScreen() {
  const theme = useTheme();
  const { configured } = useAuth();

  const goTo = (path: '/signup' | '/login') => {
    tapFeedback();
    router.replace(path);
  };

  return (
    <AuthScreen>
      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <BrandMark size={56} onBrand />
          <View>
            <Text style={styles.heroWordmark}>Iskhwama</Text>
            <Text style={styles.heroTagline}>Smart money, every day</Text>
          </View>
        </View>
        <Text style={styles.heroPitch}>
          See where every rand goes, and let your phone coach you through the month.
        </Text>
        <View style={styles.heroChips}>
          {['Takes a minute', 'No card needed', 'Works offline'].map((chip) => (
            <View key={chip} style={styles.heroChip}>
              <Ionicons name="checkmark-circle" size={12} color="rgba(255,255,255,0.95)" />
              <Text style={styles.heroChipLabel}>{chip}</Text>
            </View>
          ))}
        </View>
      </View>

      <AuthSheet>
        <AuthTitle
          title="Create your account"
          subtitle="Three fields, then you are straight into the app. No card, no verification codes."
        />

        <View style={styles.perks}>
          {PERKS.map((perk) => (
            <View key={perk.title} style={styles.perk}>
              <View style={[styles.perkIcon, { backgroundColor: theme.primarySoft }]}>
                <Ionicons name={perk.icon} size={16} color={theme.primary} />
              </View>
              <View style={styles.perkBody}>
                <Text style={[styles.perkTitle, { color: theme.text }]}>{perk.title}</Text>
                <Text style={[styles.perkCopy, { color: theme.textSecondary }]}>{perk.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {configured ? null : (
          <AuthMessage tone="info" icon="construct-outline">
            Add your Firebase web config to .env to switch accounts on. Everything else works as is.
          </AuthMessage>
        )}

        <AppButton
          label="Create account"
          icon="sparkles"
          size="lg"
          onPress={() => goTo('/signup')}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in to an existing account"
          onPress={() => goTo('/login')}
          style={({ pressed }) => [
            styles.signInLink,
            { borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
          ]}>
          <Text style={[styles.signInLabel, { color: theme.textSecondary }]}>
            I already have an account
          </Text>
          <Ionicons name="arrow-forward" size={15} color={theme.primary} />
        </Pressable>

        <AuthLegal>
          Iskhwama stores your expenses on this device. Your sign-in details are handled by Firebase
          and never touch our storage.
        </AuthLegal>
      </AuthSheet>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
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
  perks: { gap: 14 },
  perk: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  perkIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkBody: { flex: 1, gap: 2 },
  perkTitle: { fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2 },
  perkCopy: { fontSize: 12.5, fontWeight: '500', lineHeight: 18 },
  signInLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  signInLabel: { fontSize: 14, fontWeight: '700' },
});