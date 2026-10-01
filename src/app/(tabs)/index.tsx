import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { BrandHeader } from '@/components/brand';
import { Card } from '@/components/card';
import { ExpenseRow } from '@/components/expense-row';
import { getCategory, type Expense } from '@/constants/categories';
import { Brand, MaxContentWidth, Radius } from '@/constants/theme';
import { useMonthBreakdown, useWeekTrend } from '@/hooks/use-expense-analytics';
import { useAuth } from '@/hooks/use-auth';
import { useExpenses, useExpenseSummary } from '@/hooks/use-expenses';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import {
  formatDayNumber,
  formatLongDay,
  formatMonth,
  formatRelativeDay,
} from '@/lib/date';
import { tapFeedback } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';
import {
  describeDuplicate,
  detectRecurring,
  findAnomalousDay,
  findDuplicates,
  safeToSpendToday,
  suggestRetags,
} from '@/lib/smart';

const RECENT_LIMIT = 12;

type DaySummary = {
  key: string;
  total: number;
  data: Expense[];
};

function useDaySections(expenses: Expense[], filter: string | null) {
  return useMemo(() => {
    const source = filter
      ? expenses.filter((expense) => expense.date === filter)
      : expenses.slice(0, RECENT_LIMIT);

    const groups: DaySummary[] = [];
    let current: DaySummary | undefined;

    for (const expense of source) {
      if (!current || current.key !== expense.date) {
        current = { key: expense.date, total: 0, data: [] };
        groups.push(current);
      }
      current.total += expense.amount;
      current.data.push(expense);
    }

    return groups;
  }, [expenses, filter]);
}

function greeting(name?: string) {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName ? `${part}, ${firstName}` : part;
}

export default function DashboardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { expenses, clearExpenses, restoreSampleData, updateExpense } = useExpenses();
  const { account, signOut } = useAuth();
  const { profile } = useProfile();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    if (!confirmSignOut) return;
    const timer = setTimeout(() => setConfirmSignOut(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmSignOut]);
  const summary = useExpenseSummary(expenses);
  const breakdown = useMonthBreakdown(expenses);
  const sections = useDaySections(expenses, selectedDay);
  const trend = useWeekTrend(expenses);

  const safe = useMemo(
    () =>
      safeToSpendToday({
        goal: profile.monthlyGoal,
        spent: summary.monthTotal,
        daysElapsed: summary.daysElapsed,
        daysInMonth: summary.daysInMonth,
      }),
    [profile.monthlyGoal, summary.monthTotal, summary.daysElapsed, summary.daysInMonth]
  );
  const duplicates = useMemo(() => findDuplicates(expenses), [expenses]);
  const recurring = useMemo(() => detectRecurring(expenses), [expenses]);
  const anomaly = useMemo(() => findAnomalousDay(expenses), [expenses]);
  const retags = useMemo(() => suggestRetags(expenses), [expenses]);
  const spotted = duplicates.length + recurring.length + retags.length + (anomaly ? 1 : 0);
  const anomalyInRange = anomaly !== null && trend.days.some((day) => day.key === anomaly.key);

  const maxDay = Math.max(...trend.days.map((day) => day.total), 1);
  const topCategoryTotal = breakdown[0]?.total ?? 0;
  const trendUp = (trend.change ?? 0) > 0;

  const openExpense = (expense: Expense) => {
    tapFeedback();
    router.push(`/expense/${expense.id}`);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExpenseRow expense={item} onPress={openExpense} divider={false} />}
        renderSectionHeader={({ section }) => (
          <View style={[styles.dayHeader, { backgroundColor: theme.background }]}>
            <Text style={[styles.dayLabel, { color: theme.textMuted }]}>
              {formatRelativeDay(section.key)}
            </Text>
            <Text style={[styles.dayTotal, { color: theme.textSecondary }]}>
              {formatMoney(section.total)}
            </Text>
          </View>
        )}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 96 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <BrandHeader />
              <View style={styles.headerActions}>
                {confirmSignOut ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Confirm sign out"
                    onPress={() => void signOut()}
                    style={({ pressed }) => [
                      styles.confirmPill,
                      { backgroundColor: theme.dangerSoft, opacity: pressed ? 0.7 : 1 },
                    ]}>
                    <Ionicons name="log-out" size={13} color={theme.danger} />
                    <Text style={[styles.confirmPillLabel, { color: theme.danger }]}>Sign out?</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Sign out"
                    onPress={() => {
                      tapFeedback();
                      setConfirmSignOut(true);
                    }}
                    style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.6 : 1 }]}>
                    <Ionicons name="log-out-outline" size={18} color={theme.textMuted} />
                  </Pressable>
                )}
                <View style={[styles.monthChip, { backgroundColor: theme.primarySoft }]}>
                  <Text style={[styles.monthChipLabel, { color: theme.onPrimarySoft }]}>
                    {formatMonth(new Date())}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.hero}>
              <View style={styles.heroGlow} />
              <View style={styles.heroBag}>
                <Ionicons name="cash" size={104} color="rgba(255,255,255,0.1)" />
              </View>

              <Text style={styles.heroEyebrow}>{greeting(account?.name)}</Text>
              <Text style={styles.heroAmount}>{formatMoney(summary.monthTotal)}</Text>
              <Text style={styles.heroMeta}>
                spent in {formatMonth(new Date())} · {summary.monthCount}{' '}
                {summary.monthCount === 1 ? 'expense' : 'expenses'}
              </Text>

              <View style={styles.heroFooter}>
                <View style={styles.heroChip}>
                  <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.heroChipLabel}>
                    Day {summary.daysElapsed} of {summary.daysInMonth}
                  </Text>
                </View>
                <View style={styles.heroChip}>
                  <Ionicons name="shield-checkmark-outline" size={13} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.heroChipLabel}>
                    {safe.daysLeft > 0
                      ? `${formatMoney(safe.amount)} safe / day`
                      : `${formatMoney(summary.averagePerDay)} / day`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: theme.backgroundElement }]}>
                <Ionicons name="today" size={18} color={theme.primary} />
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Today</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {formatMoney(summary.todayTotal)}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.backgroundElement }]}>
                <Ionicons
                  name="trending-down"
                  size={18}
                  color={summary.topCategoryId ? getCategory(summary.topCategoryId).color : theme.primary}
                />
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Biggest bucket</Text>
                <Text numberOfLines={1} style={[styles.statValue, { color: theme.text }]}>
                  {summary.topCategoryId ? getCategory(summary.topCategoryId).label : '—'}
                </Text>
              </View>
            </View>

            <Card>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Last 7 days</Text>
                  <Text style={[styles.cardHint, { color: theme.textMuted }]}>
                    {selectedDay
                      ? formatLongDay(selectedDay)
                      : `${formatMoney(trend.thisWeekTotal)} spent`}
                  </Text>
                </View>
                {trend.change !== null && !selectedDay ? (
                  <View
                    style={[
                      styles.trendPill,
                      {
                        backgroundColor: trendUp ? theme.dangerSoft : theme.primarySoft,
                      },
                    ]}>
                    <Ionicons
                      name={trendUp ? 'trending-up' : 'trending-down'}
                      size={13}
                      color={trendUp ? theme.danger : theme.primary}
                    />
                    <Text
                      style={[
                        styles.trendPillLabel,
                        { color: trendUp ? theme.danger : theme.primary },
                      ]}>
                      {Math.abs(Math.round(trend.change * 100))}%
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.chart}>
                {trend.days.map((day) => {
                  const isSelected = selectedDay === day.key;
                  const isDimmed = selectedDay !== null && !isSelected;
                  return (
                    <Pressable
                      key={day.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${formatLongDay(day.key)}, ${formatMoney(day.total)}`}
                      onPress={() => {
                        tapFeedback();
                        setSelectedDay((current) => (current === day.key ? null : day.key));
                      }}
                      style={({ pressed }) => [
                        styles.chartColumn,
                        { opacity: pressed ? 0.6 : 1 },
                      ]}>
                      <View style={styles.chartTrack}>
                        <View
                          style={[
                            styles.chartBar,
                            {
                              height: `${Math.max(4, (day.total / maxDay) * 100)}%`,
                              opacity: isDimmed ? 0.3 : 1,
                              borderRadius: isSelected ? Radius.md : Radius.sm,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.chartLabel,
                          { color: isSelected ? theme.primary : theme.textMuted },
                          isSelected ? styles.chartLabelActive : null,
                        ]}>
                        {formatDayNumber(day.key)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.chartHint, { color: theme.textMuted }]}>
                {selectedDay ? 'Tap the bar again to show every day' : 'Tap a bar to see that day only'}
              </Text>
            </Card>

            {expenses.length > 0 ? (
              <Card>
                <View style={styles.cardHeader}>
                  <View style={styles.smartTitleRow}>
                    <View style={[styles.smartIcon, { backgroundColor: theme.primarySoft }]}>
                      <Ionicons name="sparkles" size={14} color={theme.onPrimarySoft} />
                    </View>
                    <View style={styles.smartTitleCopy}>
                      <Text style={[styles.cardTitle, { color: theme.text }]}>Smart spotter</Text>
                      <Text style={[styles.cardHint, { color: theme.textMuted }]}>
                        {spotted > 0
                          ? `${spotted} thing${spotted === 1 ? '' : 's'} worth a look`
                          : 'Nothing unusual in your spending'}
                      </Text>
                    </View>
                  </View>
                </View>

                {duplicates.map((flag) => (
                  <View
                    key={`dup-${flag.id}`}
                    style={[styles.spotRow, { backgroundColor: theme.dangerSoft }]}>
                    <Ionicons name="copy-outline" size={16} color={theme.danger} />
                    <View style={styles.spotBody}>
                      <Text style={[styles.spotTitle, { color: theme.text }]}>Possible duplicate</Text>
                      <Text style={[styles.spotDetail, { color: theme.textSecondary }]}>
                        {formatMoney(flag.amount)} on {getCategory(flag.categoryId).label.toLowerCase()} —{' '}
                        {describeDuplicate(flag)}
                      </Text>
                    </View>
                  </View>
                ))}

                {recurring.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.spotRow, { backgroundColor: theme.backgroundElement }]}>
                    <Ionicons name="repeat" size={16} color={theme.primary} />
                    <View style={styles.spotBody}>
                      <Text style={[styles.spotTitle, { color: theme.text }]}>
                        {item.label} · about {formatMoney(item.average)}
                      </Text>
                      <Text style={[styles.spotDetail, { color: theme.textSecondary }]}>
                        Recurring {item.occurrences}× · next around {formatLongDay(item.nextDate)}
                      </Text>
                    </View>
                  </View>
                ))}

                {anomaly ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="See the day that ran hot"
                    onPress={() => {
                      if (!anomalyInRange) return;
                      tapFeedback();
                      setSelectedDay(anomaly.key);
                    }}
                    style={({ pressed }) => [
                      styles.spotRow,
                      { backgroundColor: theme.primarySoft, opacity: pressed ? 0.7 : 1 },
                    ]}>
                    <Ionicons name="trending-up" size={16} color={theme.onPrimarySoft} />
                    <View style={styles.spotBody}>
                      <Text style={[styles.spotTitle, { color: theme.text }]}>
                        {formatRelativeDay(anomaly.key)} ran hot
                      </Text>
                      <Text style={[styles.spotDetail, { color: theme.textSecondary }]}>
                        {formatMoney(anomaly.total)} — {anomaly.multiple.toFixed(1)}× your usual day
                        {anomalyInRange ? '. Tap to see it.' : '.'}
                      </Text>
                    </View>
                  </Pressable>
                ) : null}

                {retags.map((tag) => (
                  <View
                    key={tag.id}
                    style={[styles.spotRow, { backgroundColor: theme.backgroundElement }]}>
                    <Ionicons name="pricetag-outline" size={16} color={theme.primary} />
                    <View style={styles.spotBody}>
                      <Text style={[styles.spotTitle, { color: theme.text }]} numberOfLines={1}>
                        “{tag.note}” reads like {getCategory(tag.suggested).label}
                      </Text>
                      <Text style={[styles.spotDetail, { color: theme.textSecondary }]}>
                        Filed under {getCategory(tag.current).label.toLowerCase()}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${tag.note} to ${getCategory(tag.suggested).label}`}
                      onPress={() => {
                        tapFeedback();
                        updateExpense(tag.id, { categoryId: tag.suggested });
                      }}
                      style={({ pressed }) => [
                        styles.spotAction,
                        { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.6 : 1 },
                      ]}>
                      <Text style={[styles.spotActionLabel, { color: theme.primary }]}>Fix</Text>
                    </Pressable>
                  </View>
                ))}
              </Card>
            ) : null}

            {breakdown.length > 0 ? (
              <Card>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Where it went</Text>
                    <Text style={[styles.cardHint, { color: theme.textMuted }]}>
                      Top category takes{' '}
                      {Math.round((topCategoryTotal / Math.max(1, summary.monthTotal)) * 100)}% of the
                      month
                    </Text>
                  </View>
                </View>

                {breakdown.slice(0, 5).map((item) => (
                  <View key={item.categoryId} style={styles.breakdownRow}>
                    <View style={styles.breakdownLabel}>
                      <View style={[styles.breakdownDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.breakdownName, { color: theme.text }]}>{item.label}</Text>
                    </View>
                    <Text style={[styles.breakdownAmount, { color: theme.textSecondary }]}>
                      {formatMoney(item.total)}
                    </Text>
                    <View style={[styles.breakdownTrack, { backgroundColor: theme.backgroundElement }]}>
                      <View
                        style={[
                          styles.breakdownFill,
                          {
                            width: `${Math.max(6, (item.total / topCategoryTotal) * 100)}%`,
                            backgroundColor: item.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </Card>
            ) : null}

            {selectedDay ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear the day filter"
                onPress={() => {
                  tapFeedback();
                  setSelectedDay(null);
                }}
                style={({ pressed }) => [
                  styles.filterBanner,
                  { backgroundColor: theme.primarySoft, opacity: pressed ? 0.7 : 1 },
                ]}>
                <Ionicons name="funnel" size={14} color={theme.onPrimarySoft} />
                <Text style={[styles.filterBannerLabel, { color: theme.onPrimarySoft }]}>
                  {sections.length === 0
                    ? `Nothing logged on ${formatRelativeDay(selectedDay).toLowerCase()}`
                    : `${formatRelativeDay(selectedDay)} · ${formatMoney(sections[0].total)}`}
                </Text>
                <Ionicons name="close-circle" size={17} color={theme.onPrimarySoft} />
              </Pressable>
            ) : null}

            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Activity</Text>
              <Text style={[styles.sectionHint, { color: theme.textMuted }]}>
                {selectedDay ? 'Filtered' : `${expenses.length} logged`}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: theme.backgroundElement }]}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.background }]}>
              <Ionicons name="cash" size={30} color={Brand.green} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Your wallet is wide open</Text>
            <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
              Log your first expense and Iskhwama will show you exactly where the money goes.
            </Text>
            <View style={styles.emptyActions}>
              <AppButton label="Add expense" icon="add" onPress={() => router.push('/expense/new')} />
              <AppButton label="Load sample data" variant="ghost" onPress={restoreSampleData} />
            </View>
          </View>
        }
        ListFooterComponent={
          expenses.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={clearExpenses}
              style={({ pressed }) => [styles.clearAll, { opacity: pressed ? 0.6 : 1 }]}>
              <Ionicons name="trash-outline" size={14} color={theme.textMuted} />
              <Text style={[styles.clearLabel, { color: theme.textMuted }]}>Clear all expenses</Text>
            </Pressable>
          ) : null
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add expense"
        onPress={() => {
          tapFeedback();
          router.push('/expense/new');
        }}
        style={({ pressed }) => [
          styles.fab,
          {
            bottom: tabBarHeight + 20,
            shadowColor: Brand.greenDark,
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}>
        <Ionicons name="add" size={22} color="#FFFFFF" />
        <Text style={styles.fabLabel}>Add expense</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  header: {
    gap: 16,
    paddingBottom: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: Radius.pill,
  },
  confirmPillLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  monthChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  monthChipLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  hero: {
    borderRadius: Radius.xl,
    padding: 22,
    overflow: 'hidden',
    gap: 4,
    experimental_backgroundImage: Brand.gradientCard,
    shadowColor: Brand.greenDark,
    shadowOpacity: 0.3,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  heroGlow: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  heroBag: {
    position: 'absolute',
    bottom: -14,
    right: 10,
    transform: [{ rotate: '-12deg' }],
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1.4,
    marginTop: 2,
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
  },
  heroFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroChipLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    gap: 6,
    padding: 16,
    borderRadius: Radius.lg,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  cardHint: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 2,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  trendPillLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    height: 120,
  },
  chartColumn: {
    flex: 1,
    gap: 8,
    alignItems: 'center',
  },
  chartTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    borderRadius: Radius.sm,
    experimental_backgroundImage: Brand.gradientCard,
  },
  chartLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  chartLabelActive: {
    fontWeight: '800',
  },
  chartHint: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: Radius.md,
  },
  filterBannerLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  smartTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  smartTitleCopy: {
    flex: 1,
  },
  smartIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: Radius.md,
  },
  spotBody: {
    flex: 1,
    gap: 2,
  },
  spotTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  spotDetail: {
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 17,
  },
  spotAction: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  spotActionLabel: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  breakdownRow: {
    gap: 6,
  },
  breakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  breakdownTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sectionHint: {
    fontSize: 13,
    fontWeight: '600',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingBottom: 4,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dayTotal: {
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    padding: 26,
    borderRadius: Radius.lg,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  emptyBody: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  clearAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 22,
  },
  clearLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: Radius.pill,
    experimental_backgroundImage: Brand.gradientFab,
    shadowColor: Brand.greenDark,
    shadowOpacity: 0.38,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  fabLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
