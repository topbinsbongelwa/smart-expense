import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { BrandMark } from '@/components/brand';
import { Card } from '@/components/card';
import { Brand, MaxContentWidth, Radius } from '@/constants/theme';
import { useMonthBreakdown, useMonthlyTotals } from '@/hooks/use-expense-analytics';
import { useAuth } from '@/hooks/use-auth';
import { useExpenses, useExpenseSummary } from '@/hooks/use-expenses';
import { initials, useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { errorFeedback, successFeedback } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';

const SECRET_KEY = 'iskhwama.secret.v1';

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { expenses, clearExpenses, restoreSampleData, hydrated } = useExpenses();
  const { profile, setName, setMonthlyGoal } = useProfile();
  const { account } = useAuth();

  const [draftName, setDraftName] = useState(profile.name);
  const [draftGoal, setDraftGoal] = useState((profile.monthlyGoal / 100).toFixed(0));
  const [saved, setSaved] = useState(false);

  const [secretReady, setSecretReady] = useState(false);
  const [storedCode, setStoredCode] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [gateError, setGateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(SECRET_KEY)
      .then((raw) => {
        if (cancelled) return;
        setStoredCode(raw && /^\d{4,6}$/.test(raw) ? raw : null);
        setSecretReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setStoredCode(null);
          setSecretReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useExpenseSummary(expenses);
  const breakdown = useMonthBreakdown(expenses);
  const months = useMonthlyTotals(expenses);
  const bestMonth = useMemo(() => months.reduce((best, month) => (month.total > best.total ? month : best), months[0]), [months]);

  const lifetimeTotal = useMemo(() => expenses.reduce((total, expense) => total + expense.amount, 0), [expenses]);
  const firstTracked = useMemo(() => {
    if (expenses.length === 0) return null;
    return expenses.reduce((earliest, expense) => (expense.date < earliest ? expense.date : earliest), expenses[0].date);
  }, [expenses]);

  function commit() {
    setName(draftName);
    const goal = Number(draftGoal.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(goal) && goal > 0) setMonthlyGoal(goal * 100);
    setSaved(true);
  }

  const creating = storedCode === null;

  function submitCode() {
    if (creating) {
      if (!/^\d{4,6}$/.test(code)) {
        errorFeedback();
        setGateError('Choose a secret code with 4 to 6 digits.');
        return;
      }
      if (code !== confirmCode) {
        errorFeedback();
        setGateError('The codes do not match. Try again.');
        return;
      }
      AsyncStorage.setItem(SECRET_KEY, code).catch(() => undefined);
      setStoredCode(code);
      setUnlocked(true);
      setCode('');
      setConfirmCode('');
      setGateError(null);
      successFeedback();
      return;
    }

    if (code === storedCode) {
      setUnlocked(true);
      setCode('');
      setGateError(null);
      successFeedback();
    } else {
      errorFeedback();
      setGateError('That secret code is not correct.');
      setCode('');
    }
  }

  if (!secretReady) {
    return (
      <View style={[styles.screen, styles.gateLoading, { backgroundColor: theme.background }]}>
        <Ionicons name="lock-closed" size={22} color={theme.textMuted} />
      </View>
    );
  }

  if (!unlocked) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: tabBarHeight + 40, paddingTop: insets.top + 12 },
          ]}>
          <View style={styles.header}>
            <Text style={[styles.eyebrow, { color: theme.textMuted }]}>Account</Text>
            <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
          </View>

          <View style={[styles.gateCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={[styles.gateIcon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name={creating ? 'key' : 'lock-closed'} size={24} color={theme.primary} />
            </View>

            <Text style={[styles.gateTitle, { color: theme.text }]}>
              {creating ? 'Create a secret code' : 'Profile locked'}
            </Text>
            <Text style={[styles.gateText, { color: theme.textSecondary }]}>
              {creating
                ? 'This profile is private. Choose a 4 to 6 digit secret code — you will need it every time you open Profile.'
                : 'Enter your secret code to unlock your profile and settings.'}
            </Text>

            <TextInput
              value={code}
              onChangeText={(value) => {
                setCode(value.replace(/[^0-9]/g, '').slice(0, 6));
                setGateError(null);
              }}
              placeholder="••••"
              placeholderTextColor={theme.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              autoFocus
              onSubmitEditing={submitCode}
              style={[
                styles.gateInput,
                { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
              ]}
            />

            {creating ? (
              <TextInput
                value={confirmCode}
                onChangeText={(value) => {
                  setConfirmCode(value.replace(/[^0-9]/g, '').slice(0, 6));
                  setGateError(null);
                }}
                placeholder="Repeat the code"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
                onSubmitEditing={submitCode}
                style={[
                  styles.gateInput,
                  { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                ]}
              />
            ) : null}

            {gateError ? (
              <Text style={[styles.gateError, { color: theme.danger }]}>{gateError}</Text>
            ) : null}

            <AppButton
              label={creating ? 'Save & unlock' : 'Unlock profile'}
              icon={creating ? 'checkmark' : 'lock-open'}
              onPress={submitCode}
            />

            <Text style={[styles.gateHint, { color: theme.textMuted }]}>
              Your secret code never leaves this device.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 40, paddingTop: insets.top + 12 },
        ]}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: theme.textMuted }]}>Account</Text>
          <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
        </View>

        <View style={[styles.profileCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLabel}>{initials(profile.name)}</Text>
            </View>
            <View style={styles.profileBody}>
              <Text style={[styles.profileName, { color: theme.text }]}>{profile.name}</Text>
              <Text style={[styles.profileMeta, { color: theme.textMuted }]}>
                {account?.email ??
                  (firstTracked ? `Tracking since ${firstTracked}` : 'No entries yet')}
              </Text>
            </View>
            <BrandMark size={40} />
          </View>

          <View style={styles.profileStats}>
            <View style={styles.profileStat}>
              <Text style={[styles.profileStatValue, { color: theme.text }]}>
                {formatMoney(lifetimeTotal)}
              </Text>
              <Text style={[styles.profileStatLabel, { color: theme.textMuted }]}>All-time spend</Text>
            </View>
            <View style={[styles.profileStatDivider, { backgroundColor: theme.border }]} />
            <View style={styles.profileStat}>
              <Text style={[styles.profileStatValue, { color: theme.text }]}>{expenses.length}</Text>
              <Text style={[styles.profileStatLabel, { color: theme.textMuted }]}>Entries</Text>
            </View>
            <View style={[styles.profileStatDivider, { backgroundColor: theme.border }]} />
            <View style={styles.profileStat}>
              <Text style={[styles.profileStatValue, { color: theme.text }]}>
                {breakdown[0]?.label ?? '—'}
              </Text>
              <Text style={[styles.profileStatLabel, { color: theme.textMuted }]}>Top category</Text>
            </View>
          </View>
        </View>

        <Card style={styles.formCard}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Personalise</Text>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Display name</Text>
            <TextInput
              value={draftName}
              onChangeText={(value) => {
                setDraftName(value);
                setSaved(false);
              }}
              placeholder="Your name"
              placeholderTextColor={theme.textMuted}
              maxLength={24}
              style={[
                styles.input,
                { backgroundColor: theme.backgroundElement, color: theme.text },
              ]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Monthly target (R)</Text>
            <TextInput
              value={draftGoal}
              onChangeText={(value) => {
                setDraftGoal(value);
                setSaved(false);
              }}
              keyboardType="number-pad"
              style={[
                styles.input,
                { backgroundColor: theme.backgroundElement, color: theme.text },
              ]}
            />
          </View>

          <AppButton
            label={saved ? 'Saved' : 'Save changes'}
            icon={saved ? 'checkmark' : 'save-outline'}
            variant={saved ? 'secondary' : 'primary'}
            onPress={commit}
          />
        </Card>

        <Card style={styles.formCard}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Your money snapshot</Text>
          <View style={styles.snapshotRow}>
            <Ionicons name="trending-up" size={18} color={theme.primary} />
            <Text style={[styles.snapshotLabel, { color: theme.textSecondary }]}>This month</Text>
            <Text style={[styles.snapshotValue, { color: theme.text }]}>
              {formatMoney(summary.monthTotal)}
            </Text>
          </View>
          <View style={styles.snapshotRow}>
            <Ionicons name="speedometer" size={18} color="#0D9488" />
            <Text style={[styles.snapshotLabel, { color: theme.textSecondary }]}>Daily average</Text>
            <Text style={[styles.snapshotValue, { color: theme.text }]}>
              {formatMoney(summary.averagePerDay)}
            </Text>
          </View>
          <View style={styles.snapshotRow}>
            <Ionicons name="trophy" size={18} color="#B45309" />
            <Text style={[styles.snapshotLabel, { color: theme.textSecondary }]}>Heaviest month</Text>
            <Text style={[styles.snapshotValue, { color: theme.text }]}>
              {bestMonth.total > 0 ? formatMoney(bestMonth.total) : '—'}
            </Text>
          </View>
        </Card>

        <Card style={styles.formCard}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Data</Text>
          <Text style={[styles.cardHint, { color: theme.textSecondary }]}>
            Your expenses stay on this device. Signing in only uses your email and name — nothing is
            uploaded and nothing is sold.
          </Text>

          <View style={styles.dataActions}>
            <AppButton
              label="Restore sample data"
              icon="refresh"
              variant="secondary"
              disabled={!hydrated}
              onPress={restoreSampleData}
            />
            <AppButton label="Clear all expenses" icon="trash" variant="danger" onPress={clearExpenses} />
          </View>
        </Card>

        <View style={styles.about}>
          <BrandMark size={34} />
          <Text style={[styles.aboutTitle, { color: theme.text }]}>Iskhwama</Text>
          <Text style={[styles.aboutText, { color: theme.textMuted }]}>
            Money bag tracker · v{Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => undefined}
            style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.linkLabel, { color: theme.primary }]}>Built with Expo Router</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 20,
    gap: 14,
  },
  header: { gap: 2 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  profileCard: { padding: 18, borderRadius: Radius.lg, gap: 18 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    experimental_backgroundImage: Brand.gradientFab,
  },
  avatarLabel: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  profileBody: { flex: 1, gap: 2 },
  profileName: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  profileMeta: { fontSize: 12.5, fontWeight: '500' },
  profileStats: { flexDirection: 'row', alignItems: 'center' },
  profileStat: { flex: 1, gap: 2 },
  profileStatDivider: { width: StyleSheet.hairlineWidth, height: 32, marginHorizontal: 10 },
  profileStatValue: { fontSize: 15, fontWeight: '800' },
  profileStatLabel: { fontSize: 11, fontWeight: '600' },
  formCard: { gap: 14 },
  cardTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  cardHint: { fontSize: 13, fontWeight: '500', lineHeight: 19, marginTop: -6 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: '600',
  },
  snapshotRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  snapshotLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  snapshotValue: { fontSize: 15, fontWeight: '800' },
  dataActions: { gap: 10 },
  about: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  aboutTitle: { fontSize: 16, fontWeight: '800' },
  aboutText: { fontSize: 12.5, fontWeight: '500' },
  link: { paddingVertical: 6 },
  linkLabel: { fontSize: 12.5, fontWeight: '700' },
  gateLoading: { alignItems: 'center', justifyContent: 'center' },
  gateCard: { padding: 22, borderRadius: Radius.lg, gap: 12, alignItems: 'stretch' },
  gateIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  gateTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  gateText: { fontSize: 13.5, fontWeight: '500', lineHeight: 20, textAlign: 'center' },
  gateInput: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
  },
  gateError: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  gateHint: { fontSize: 11.5, fontWeight: '600', textAlign: 'center' },
});
