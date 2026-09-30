import Ionicons from '@expo/vector-icons/Ionicons';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { Card } from '@/components/card';
import { getCategory } from '@/constants/categories';
import { Brand, MaxContentWidth, Radius } from '@/constants/theme';
import {
  useLargestExpense,
  useMonthBreakdown,
  useWeekdayTotals,
  useWeekTrend,
} from '@/hooks/use-expense-analytics';
import { useExpenses, useExpenseSummary } from '@/hooks/use-expenses';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { buildInsights, buildWeeklySummary, type InsightTone } from '@/lib/insights';
import { tapFeedback } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';

export default function InsightsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { expenses, hydrated } = useExpenses();
  const { profile } = useProfile();
  const summary = useExpenseSummary(expenses);
  const breakdown = useMonthBreakdown(expenses);
  const trend = useWeekTrend(expenses);
  const weekdays = useWeekdayTotals(expenses);
  const largest = useLargestExpense(expenses);
  const [showSummary, setShowSummary] = useState(false);

  const busiest = useMemo(
    () => weekdays.reduce((best, day) => (day.total > best.total ? day : best), weekdays[0]),
    [weekdays]
  );

  const insights = useMemo(
    () =>
      buildInsights({
        expenses,
        monthTotal: summary.monthTotal,
        monthCount: summary.monthCount,
        daysElapsed: summary.daysElapsed,
        daysInMonth: summary.daysInMonth,
        weeklyChange: trend.change,
        topCategory: breakdown[0] ? { label: breakdown[0].label, total: breakdown[0].total } : null,
        largest,
        busiestDay: busiest.total > 0 ? { label: busiest.label, total: busiest.total } : null,
        topCategoryId: summary.topCategoryId,
      }),
    [expenses, summary, trend, breakdown, largest, busiest]
  );

  const toneColors: Record<InsightTone, { background: string; accent: string }> = {
    positive: { background: theme.primarySoft, accent: theme.primary },
    warning: { background: theme.dangerSoft, accent: theme.danger },
    neutral: { background: theme.backgroundElement, accent: theme.textSecondary },
  };

  const progress = profile.monthlyGoal > 0 ? Math.min(1, summary.monthTotal / profile.monthlyGoal) : 0;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 40, paddingTop: insets.top + 12 },
        ]}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: theme.textMuted }]}>Iskhwama AI</Text>
          <Text style={[styles.title, { color: theme.text }]}>Your money coach</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Patterns and tips generated on-device from your own entries. Nothing leaves your phone.
          </Text>
        </View>

        <View style={styles.goalCard}>
          <View style={styles.goalGlow} />
          <View style={styles.goalTop}>
            <View>
              <Text style={styles.goalLabel}>Monthly target</Text>
              <Text style={styles.goalValue}>{formatMoney(profile.monthlyGoal)}</Text>
            </View>
            <View style={styles.goalChip}>
              <Ionicons
                name={progress >= 1 ? 'alert' : 'flag'}
                size={13}
                color="rgba(255,255,255,0.95)"
              />
              <Text style={styles.goalChipLabel}>{Math.round(progress * 100)}% used</Text>
            </View>
          </View>

          <View style={styles.goalTrack}>
            <View style={[styles.goalFill, { width: `${Math.max(3, progress * 100)}%` }]} />
          </View>

          <Text style={styles.goalMeta}>
            {summary.monthTotal >= profile.monthlyGoal
              ? `You are ${formatMoney(summary.monthTotal - profile.monthlyGoal)} over your target with ${summary.daysInMonth - summary.daysElapsed} days to go.`
              : `${formatMoney(Math.max(0, profile.monthlyGoal - summary.monthTotal))} left before you hit your target.`}
          </Text>
        </View>

        {insights.map((insight) => {
          const colors = toneColors[insight.tone];
          return (
            <Card key={insight.id} style={styles.insightCard}>
              <View style={styles.insightRow}>
                <View style={[styles.insightIcon, { backgroundColor: colors.background }]}>
                  <Ionicons name={insight.icon} size={19} color={colors.accent} />
                </View>
                <View style={styles.insightBody}>
                  <Text style={[styles.insightTitle, { color: theme.text }]}>{insight.title}</Text>
                  <Text style={[styles.insightText, { color: theme.textSecondary }]}>{insight.body}</Text>
                </View>
              </View>
            </Card>
          );
        })}

        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Weekly briefing</Text>
            <Ionicons name="reader" size={18} color={theme.textMuted} />
          </View>

          {showSummary ? (
            <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
              {buildWeeklySummary({
                expenses,
                monthTotal: summary.monthTotal,
                weeklyTotal: trend.thisWeekTotal,
                topCategory: breakdown[0] ? { label: breakdown[0].label } : null,
              })}
            </Text>
          ) : (
            <Text style={[styles.summaryText, { color: theme.textMuted }]}>
              Tap below and Iskhwama will read your week back to you in plain language.
            </Text>
          )}

          <AppButton
            label={showSummary ? 'Refresh briefing' : 'Generate my briefing'}
            icon="sparkles"
            variant={showSummary ? 'secondary' : 'primary'}
            disabled={!hydrated}
            onPress={() => {
              tapFeedback();
              setShowSummary(true);
            }}
          />
        </Card>

        {summary.topCategoryId ? (
          <Card style={styles.footerCard}>
            <Text style={[styles.footerTitle, { color: theme.text }]}>Coach&apos;s note</Text>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Right now {getCategory(summary.topCategoryId).label.toLowerCase()} is your biggest
              bucket. Tag a few more entries and Iskhwama will compare your pace against your target
              every time you open the app.
            </Text>
          </Card>
        ) : null}
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
  header: { gap: 4 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 13.5, fontWeight: '500', lineHeight: 19 },
  goalCard: {
    borderRadius: Radius.xl,
    padding: 20,
    gap: 12,
    overflow: 'hidden',
    experimental_backgroundImage: Brand.gradientCard,
    shadowColor: Brand.greenDark,
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  goalGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  goalTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  goalLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  goalValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  goalChipLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  goalTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  goalFill: { height: '100%', borderRadius: 4, backgroundColor: '#FFFFFF' },
  goalMeta: { color: 'rgba(255,255,255,0.88)', fontSize: 12.5, fontWeight: '500', lineHeight: 18 },
  insightCard: { paddingVertical: 16 },
  insightRow: { flexDirection: 'row', gap: 12 },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightBody: { flex: 1, gap: 4 },
  insightTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  insightText: { fontSize: 13.5, fontWeight: '500', lineHeight: 19 },
  summaryCard: { gap: 12 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  summaryText: { fontSize: 14, fontWeight: '500', lineHeight: 21 },
  footerCard: { gap: 6 },
  footerTitle: { fontSize: 15, fontWeight: '800' },
  footerText: { fontSize: 13.5, fontWeight: '500', lineHeight: 20 },
});
