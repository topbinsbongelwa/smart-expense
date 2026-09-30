import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { BrandMark } from '@/components/brand';
import { Card } from '@/components/card';
import { Brand, MaxContentWidth, Radius } from '@/constants/theme';
import {
  useMonthBreakdown,
  useMonthlyTotals,
} from '@/hooks/use-expense-analytics';
import { useExpenses, useExpenseSummary } from '@/hooks/use-expenses';
import { initials, useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/lib/money';

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { expenses, clearExpenses, restoreSampleData, hydrated } = useExpenses();
  const { profile, setName, setMonthlyGoal } = useProfile();

  const [draftName, setDraftName] = useState(profile.name);
  const [draftGoal, setDraftGoal] = useState((profile.monthlyGoal / 100).toFixed(0));
  const [saved, setSaved] = useState(false);

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
                {firstTracked ? `Tracking since ${firstTracked}` : 'No entries yet'}
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
            Everything lives on this device in local storage. No account, no sync, no tracking.
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
});
