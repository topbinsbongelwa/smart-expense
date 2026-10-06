import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { BrandMark } from '@/components/brand';
import { Card } from '@/components/card';
import { ExpenseRow } from '@/components/expense-row';
import { MaxContentWidth, Radius } from '@/constants/theme';
import { useTotalsByDate } from '@/hooks/use-expense-analytics';
import { useExpenses } from '@/hooks/use-expenses';
import { useTheme } from '@/hooks/use-theme';
import { formatLongDay, formatMonth, fromDateKey, toDateKey, todayKey } from '@/lib/date';
import { tapFeedback } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';

const WEEKDAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type Cell = { key: string; day: number; inMonth: boolean };

function buildMonthGrid(month: Date): Cell[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const cells: Cell[] = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    const date = new Date(year, monthIndex, 1 - (firstWeekday - index));
    cells.push({ key: toDateKey(date), day: date.getDate(), inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex, day);
    cells.push({ key: toDateKey(date), day, inMonth: true });
  }

  while (cells.length % 7 !== 0) {
    const date = fromDateKey(cells[cells.length - 1].key);
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    cells.push({ key: toDateKey(next), day: next.getDate(), inMonth: false });
  }

  return cells;
}

export default function CalendarScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { expenses } = useExpenses();
  const totalsByDate = useTotalsByDate(expenses);
  const today = todayKey();

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState(today);

  const cells = useMemo(() => buildMonthGrid(month), [month]);
  const maxDayTotal = Math.max(...[...totalsByDate.values()], 1);
  const selectedTotal = totalsByDate.get(selected) ?? 0;
  const selectedExpenses = expenses.filter((expense) => expense.date === selected);
  const monthTotal = useMemo(() => {
    let total = 0;
    for (const [key, value] of totalsByDate) {
      const date = fromDateKey(key);
      if (date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear()) {
        total += value;
      }
    }
    return total;
  }, [totalsByDate, month]);

  function shiftMonth(offset: number) {
    tapFeedback();
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function goToToday() {
    tapFeedback();
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(today);
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 40, paddingTop: insets.top + 12 },
        ]}>
        <View style={styles.headerRow}>
          <View style={styles.header}>
            <Text style={[styles.eyebrow, { color: theme.textMuted }]}>Time-based logging</Text>
            <Text style={[styles.title, { color: theme.text }]}>Calendar</Text>
          </View>
          <BrandMark size={54} />
        </View>

        <Card style={styles.calendarCard}>
          <View style={styles.monthNav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={() => shiftMonth(-1)}
              hitSlop={10}
              style={({ pressed }) => [
                styles.navButton,
                { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.6 : 1 },
              ]}>
              <Ionicons name="chevron-back" size={18} color={theme.text} />
            </Pressable>

            <Pressable accessibilityRole="button" onPress={goToToday} style={styles.monthLabelWrap}>
              <Text style={[styles.monthLabel, { color: theme.text }]}>{formatMonth(month)}</Text>
              <Text style={[styles.monthTotal, { color: theme.textMuted }]}>
                {formatMoney(monthTotal)} logged
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={() => shiftMonth(1)}
              hitSlop={10}
              style={({ pressed }) => [
                styles.navButton,
                { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.6 : 1 },
              ]}>
              <Ionicons name="chevron-forward" size={18} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAY_HEADERS.map((label, index) => (
              <Text key={`${label}-${index}`} style={[styles.weekLabel, { color: theme.textMuted }]}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((cell) => {
              const total = totalsByDate.get(cell.key) ?? 0;
              const isSelected = cell.key === selected;
              const isToday = cell.key === today;

              return (
                <Pressable
                  key={cell.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${formatLongDay(cell.key)}, ${formatMoney(total)}`}
                  onPress={() => {
                    tapFeedback();
                    setSelected(cell.key);
                    if (!cell.inMonth) {
                      const date = fromDateKey(cell.key);
                      setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                    }
                  }}
                  style={styles.cell}>
                  <View
                    style={[
                      styles.cellBubble,
                      isSelected && { backgroundColor: theme.primary },
                      isToday && !isSelected && { borderColor: theme.primary, borderWidth: 1.5 },
                    ]}>
                    <Text
                      style={[
                        styles.cellDay,
                        {
                          color: isSelected
                            ? theme.onBrand
                            : cell.inMonth
                              ? theme.text
                              : theme.textMuted,
                        },
                      ]}>
                      {cell.day}
                    </Text>
                  </View>
                  <View style={[styles.cellTrack, { backgroundColor: theme.backgroundElement }]}>
                    <View
                      style={[
                        styles.cellBar,
                        {
                          height: `${total > 0 ? Math.max(12, (total / maxDayTotal) * 100) : 0}%`,
                          backgroundColor: isSelected ? theme.onBrand : theme.primary,
                          opacity: isSelected ? 0.9 : 0.55,
                        },
                      ]}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.legend}>
            <View style={[styles.legendSwatch, { backgroundColor: theme.primary }]} />
            <Text style={[styles.legendText, { color: theme.textMuted }]}>
              Bar height shows spend per day
            </Text>
          </View>
        </Card>

        <View style={styles.dayHeader}>
          <View>
            <Text style={[styles.dayTitle, { color: theme.text }]}>{formatLongDay(selected)}</Text>
            <Text style={[styles.dayTotal, { color: theme.textMuted }]}>
              {formatMoney(selectedTotal)} · {selectedExpenses.length}{' '}
              {selectedExpenses.length === 1 ? 'expense' : 'expenses'}
            </Text>
          </View>
          <AppButton
            label="Add"
            icon="add"
            size="md"
            onPress={() =>
              router.push({ pathname: '/expense/[id]', params: { id: 'new', date: selected } })
            }
          />
        </View>

        {selectedExpenses.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="calendar-clear-outline" size={22} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nothing logged on this day yet.
            </Text>
          </View>
        ) : (
          <Card style={styles.dayList}>
            {selectedExpenses.map((expense, index) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                onPress={(item) => router.push(`/expense/${item.id}`)}
                divider={index !== selectedExpenses.length - 1}
              />
            ))}
          </Card>
        )}
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
  header: { gap: 2, flexShrink: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  calendarCard: { gap: 14 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabelWrap: { alignItems: 'center' },
  monthLabel: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  monthTotal: { fontSize: 12, fontWeight: '600' },
  weekRow: { flexDirection: 'row' },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', gap: 4, paddingVertical: 3 },
  cellBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellDay: { fontSize: 13, fontWeight: '700' },
  cellTrack: {
    width: 20,
    height: 22,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  cellBar: { width: '100%', borderRadius: 4 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendSwatch: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 11.5, fontWeight: '600' },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dayTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  dayTotal: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  dayList: { paddingVertical: 6 },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 18,
    borderRadius: Radius.lg,
  },
  emptyText: { fontSize: 14, fontWeight: '500' },
});
