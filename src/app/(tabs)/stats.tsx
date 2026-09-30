import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { Card } from '@/components/card';
import { getCategory } from '@/constants/categories';
import { Brand, MaxContentWidth, Radius } from '@/constants/theme';
import {
  useLargestExpense,
  useMonthBreakdown,
  useMonthlyTotals,
  useWeekdayTotals,
  useWeekTrend,
} from '@/hooks/use-expense-analytics';
import { useExpenses, useExpenseSummary } from '@/hooks/use-expenses';
import { useTheme } from '@/hooks/use-theme';
import { formatLongDay, formatMonth } from '@/lib/date';
import { formatMoney } from '@/lib/money';

function StatTile({
  icon,
  label,
  value,
  tint,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  tint: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.tileIcon, { backgroundColor: `${tint}1F` }]}>
        <Ionicons name={icon} size={15} color={tint} />
      </View>
      <Text style={[styles.tileValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { expenses } = useExpenses();
  const summary = useExpenseSummary(expenses);
  const breakdown = useMonthBreakdown(expenses);
  const weekdays = useWeekdayTotals(expenses);
  const months = useMonthlyTotals(expenses);
  const trend = useWeekTrend(expenses);
  const largest = useLargestExpense(expenses);

  const maxWeekday = Math.max(...weekdays.map((day) => day.total), 1);
  const busiest = useMemo(
    () => weekdays.reduce((best, day) => (day.total > best.total ? day : best), weekdays[0]),
    [weekdays]
  );
  const maxMonth = Math.max(...months.map((month) => month.total), 1);
  const monthTotal = Math.max(1, summary.monthTotal);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 40, paddingTop: insets.top + 12 },
        ]}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: theme.textMuted }]}>Statistics</Text>
          <Text style={[styles.title, { color: theme.text }]}>Where you stand</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {formatMonth(new Date())} · {summary.monthCount} tracked{' '}
            {summary.monthCount === 1 ? 'entry' : 'entries'}
          </Text>
        </View>

        <View style={styles.tileGrid}>
          <StatTile
            icon="wallet"
            label="Spent this month"
            value={formatMoney(summary.monthTotal)}
            tint={Brand.green}
          />
          <StatTile icon="speedometer" label="Average per day" value={formatMoney(summary.averagePerDay)} tint="#0D9488" />
          <StatTile icon="today" label="Spent today" value={formatMoney(summary.todayTotal)} tint="#B45309" />
          <StatTile
            icon="flash"
            label="Largest expense"
            value={largest ? formatMoney(largest.amount) : '—'}
            tint="#BE185D"
          />
        </View>

        <Card>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Monthly rhythm</Text>
            <Text style={[styles.cardHint, { color: theme.textMuted }]}>Last {months.length} months</Text>
          </View>

          <View style={styles.monthChart}>
            {months.map((month) => (
              <View key={month.key} style={styles.monthColumn}>
                <View style={styles.monthTrack}>
                  <View
                    style={[
                      styles.monthBar,
                      {
                        height: `${Math.max(4, (month.total / maxMonth) * 100)}%`,
                        opacity: month.isCurrent ? 1 : 0.45,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.monthLabel, { color: theme.textMuted }]}>{month.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Category split</Text>
            <Text style={[styles.cardHint, { color: theme.textMuted }]}>
              {breakdown.length} active
            </Text>
          </View>

          {breakdown.length === 0 ? (
            <Text style={[styles.emptyLine, { color: theme.textSecondary }]}>
              No categories yet — log an expense to see the split.
            </Text>
          ) : (
            breakdown.map((item) => (
              <View key={item.categoryId} style={styles.splitRow}>
                <View style={[styles.splitDot, { backgroundColor: item.color }]} />
                <View style={styles.splitBody}>
                  <View style={styles.splitTop}>
                    <Text style={[styles.splitName, { color: theme.text }]}>{item.label}</Text>
                    <Text style={[styles.splitAmount, { color: theme.textSecondary }]}>
                      {formatMoney(item.total)}
                    </Text>
                  </View>
                  <View style={[styles.splitTrack, { backgroundColor: theme.backgroundElement }]}>
                    <View
                      style={[
                        styles.splitFill,
                        {
                          width: `${Math.max(6, (item.total / monthTotal) * 100)}%`,
                          backgroundColor: item.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))
          )}
        </Card>

        <Card>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Weekly pulse</Text>
            <Text style={[styles.cardHint, { color: theme.textMuted }]}>
              {trend.change === null
                ? 'Building history'
                : `${trend.change > 0 ? '+' : ''}${Math.round(trend.change * 100)}% vs prior week`}
            </Text>
          </View>

          <View style={styles.weekdayChart}>
            {weekdays.map((day) => (
              <View key={day.short} style={styles.weekdayColumn}>
                <Text style={[styles.weekdayValue, { color: theme.textSecondary }]}>
                  {day.total > 0 ? formatMoney(day.total) : '—'}
                </Text>
                <View style={[styles.weekdayTrack, { backgroundColor: theme.backgroundElement }]}>
                  <View
                    style={[
                      styles.weekdayFill,
                      {
                        height: `${Math.max(4, (day.total / maxWeekday) * 100)}%`,
                        backgroundColor:
                          busiest.short === day.short ? theme.primary : theme.accent,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.weekdayLabel, { color: theme.textMuted }]}>{day.short}</Text>
              </View>
            ))}
          </View>
        </Card>

        {largest ? (
          <Card style={styles.largestCard}>
            <View style={styles.largestRow}>
              <View style={[styles.largestIcon, { backgroundColor: `${getCategory(largest.categoryId).color}1F` }]}>
                <Ionicons
                  name={getCategory(largest.categoryId).icon}
                  size={22}
                  color={getCategory(largest.categoryId).color}
                />
              </View>
              <View style={styles.largestBody}>
                <Text style={[styles.largestTitle, { color: theme.text }]}>
                  {largest.note.length > 0 ? largest.note : getCategory(largest.categoryId).label}
                </Text>
                <Text style={[styles.largestMeta, { color: theme.textMuted }]}>
                  {formatLongDay(largest.date)}
                </Text>
              </View>
              <Text style={[styles.largestAmount, { color: theme.text }]}>
                {formatMoney(largest.amount)}
              </Text>
            </View>
          </Card>
        ) : null}

        {expenses.length === 0 ? (
          <AppButton label="Add your first expense" icon="add" onPress={() => router.push('/expense/new')} />
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
    gap: 16,
  },
  header: { gap: 2 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: { fontSize: 14, fontWeight: '500' },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: 6,
    padding: 16,
    borderRadius: Radius.lg,
  },
  tileIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  tileLabel: { fontSize: 12, fontWeight: '600' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  cardHint: { fontSize: 12.5, fontWeight: '600' },
  emptyLine: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  monthChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    height: 130,
  },
  monthColumn: { flex: 1, gap: 8, alignItems: 'center' },
  monthTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  monthBar: {
    width: '100%',
    borderRadius: Radius.sm,
    experimental_backgroundImage: Brand.gradientCard,
  },
  monthLabel: { fontSize: 11, fontWeight: '700' },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  splitDot: { width: 10, height: 10, borderRadius: 5 },
  splitBody: { flex: 1, gap: 6 },
  splitTop: { flexDirection: 'row', justifyContent: 'space-between' },
  splitName: { fontSize: 14, fontWeight: '600' },
  splitAmount: { fontSize: 13, fontWeight: '700' },
  splitTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  splitFill: { height: '100%', borderRadius: 4 },
  weekdayChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 140,
  },
  weekdayColumn: { flex: 1, gap: 6, alignItems: 'center' },
  weekdayValue: { fontSize: 9.5, fontWeight: '700' },
  weekdayTrack: {
    flex: 1,
    width: '100%',
    borderRadius: Radius.sm,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  weekdayFill: { width: '100%', borderRadius: Radius.sm },
  weekdayLabel: { fontSize: 10.5, fontWeight: '700' },
  largestCard: { paddingVertical: 16 },
  largestRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  largestIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largestBody: { flex: 1, gap: 2 },
  largestTitle: { fontSize: 15, fontWeight: '700' },
  largestMeta: { fontSize: 12, fontWeight: '500' },
  largestAmount: { fontSize: 16, fontWeight: '800' },
});
