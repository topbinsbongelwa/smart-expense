import { useMemo } from 'react';

import { CATEGORIES, type CategoryId, type Expense } from '@/constants/categories';
import { fromDateKey, toDateKey } from '@/lib/date';

export type BreakdownItem = { categoryId: CategoryId; label: string; color: string; total: number };

export function useMonthBreakdown(expenses: Expense[]): BreakdownItem[] {
  return useMemo(() => {
    const now = new Date();
    const totals = new Map<CategoryId, number>();

    for (const expense of expenses) {
      const date = fromDateKey(expense.date);
      if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
        totals.set(expense.categoryId, (totals.get(expense.categoryId) ?? 0) + expense.amount);
      }
    }

    return CATEGORIES.map((category) => ({
      categoryId: category.id,
      label: category.label,
      color: category.color,
      total: totals.get(category.id) ?? 0,
    }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [expenses]);
}

export type WeekTrend = {
  days: { key: string; total: number }[];
  thisWeekTotal: number;
  previousWeekTotal: number;
  change: number | null;
};

export function useWeekTrend(expenses: Expense[]): WeekTrend {
  return useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - (6 - index));
      return { key: toDateKey(date), total: 0 };
    });
    const thisWeek = new Map(days.map((day) => [day.key, day]));
    let previousWeekTotal = 0;

    for (const expense of expenses) {
      const currentDay = thisWeek.get(expense.date);
      if (currentDay) {
        currentDay.total += expense.amount;
        continue;
      }
      const date = fromDateKey(expense.date);
      const ageInDays = Math.round(
        (startOfToday.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) /
          86_400_000
      );
      if (ageInDays >= 7 && ageInDays < 14) previousWeekTotal += expense.amount;
    }

    const thisWeekTotal = days.reduce((total, day) => total + day.total, 0);

    return {
      days,
      thisWeekTotal,
      previousWeekTotal,
      change: previousWeekTotal > 0 ? (thisWeekTotal - previousWeekTotal) / previousWeekTotal : null,
    };
  }, [expenses]);
}

export type WeekdayTotal = { label: string; short: string; total: number };

const WEEKDAYS = [
  { label: 'Monday', short: 'Mon' },
  { label: 'Tuesday', short: 'Tue' },
  { label: 'Wednesday', short: 'Wed' },
  { label: 'Thursday', short: 'Thu' },
  { label: 'Friday', short: 'Fri' },
  { label: 'Saturday', short: 'Sat' },
  { label: 'Sunday', short: 'Sun' },
];

export function useWeekdayTotals(expenses: Expense[]): WeekdayTotal[] {
  return useMemo(() => {
    const totals = WEEKDAYS.map((day) => ({ ...day, total: 0 }));

    for (const expense of expenses) {
      const date = fromDateKey(expense.date);
      const index = (date.getDay() + 6) % 7;
      totals[index].total += expense.amount;
    }

    return totals;
  }, [expenses]);
}

export type MonthTotal = { key: string; label: string; total: number; isCurrent: boolean };

export function useMonthlyTotals(expenses: Expense[], months = 6): MonthTotal[] {
  return useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: months }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleString('en-ZA', { month: 'short' }),
        total: 0,
        isCurrent: date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth(),
      };
    });
    const index = new Map(buckets.map((bucket, position) => [bucket.key, position]));

    for (const expense of expenses) {
      const date = fromDateKey(expense.date);
      const position = index.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (position !== undefined) buckets[position].total += expense.amount;
    }

    return buckets;
  }, [expenses, months]);
}

export function useTotalsByDate(expenses: Expense[]): Map<string, number> {
  return useMemo(() => {
    const totals = new Map<string, number>();
    for (const expense of expenses) {
      totals.set(expense.date, (totals.get(expense.date) ?? 0) + expense.amount);
    }
    return totals;
  }, [expenses]);
}

export function useLargestExpense(expenses: Expense[]): Expense | null {
  return useMemo(() => {
    let largest: Expense | null = null;
    for (const expense of expenses) {
      if (!largest || expense.amount > largest.amount) largest = expense;
    }
    return largest;
  }, [expenses]);
}
