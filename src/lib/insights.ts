import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { CategoryId, Expense } from '@/constants/categories';
import { formatRelativeDay } from '@/lib/date';
import { formatMoney } from '@/lib/money';

export type InsightTone = 'positive' | 'warning' | 'neutral';

export type Insight = {
  id: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  tone: InsightTone;
};

type Input = {
  expenses: Expense[];
  monthTotal: number;
  monthCount: number;
  daysElapsed: number;
  daysInMonth: number;
  weeklyChange: number | null;
  topCategory: { label: string; total: number } | null;
  largest: Expense | null;
  busiestDay: { label: string; total: number } | null;
  topCategoryId: CategoryId | null;
};

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/**
 * Turns the user's own numbers into plain-language coaching. Everything is
 * computed on-device, so the copy always matches what is in local storage.
 */
export function buildInsights(input: Input): Insight[] {
  const {
    expenses,
    monthTotal,
    monthCount,
    daysElapsed,
    daysInMonth,
    weeklyChange,
    topCategory,
    largest,
    busiestDay,
  } = input;

  if (expenses.length === 0) {
    return [
      {
        id: 'empty',
        icon: 'sparkles',
        title: 'Your coach is warming up',
        body: 'Log a few expenses and Iskhwama will start spotting patterns for you — no account, no cloud.',
        tone: 'neutral',
      },
    ];
  }

  const insights: Insight[] = [];
  const projection = daysElapsed > 0 ? Math.round((monthTotal / daysElapsed) * daysInMonth) : monthTotal;
  const paceTone: InsightTone = projection > monthTotal * 1.15 ? 'warning' : 'positive';

  insights.push({
    id: 'projection',
    icon: 'trending-up',
    title: 'Month-end projection',
    body: `At ${formatMoney(monthTotal)} over ${plural(daysElapsed, 'day')}, you are on pace to spend about ${formatMoney(projection)} by the end of ${daysInMonth === 31 ? 'the month' : `day ${daysInMonth}`}.`,
    tone: paceTone,
  });

  if (topCategory) {
    const share = monthTotal > 0 ? Math.round((topCategory.total / monthTotal) * 100) : 0;
    insights.push({
      id: 'top-category',
      icon: 'pie-chart',
      title: `${topCategory.label} leads the month`,
      body: `${formatMoney(topCategory.total)} so far — ${share}% of everything you have tracked this month.`,
      tone: share >= 50 ? 'warning' : 'neutral',
    });
  }

  if (weeklyChange !== null) {
    const up = weeklyChange > 0;
    insights.push({
      id: 'weekly-change',
      icon: up ? 'arrow-up-circle' : 'arrow-down-circle',
      title: up ? 'Spending ticked up this week' : 'Spending cooled down this week',
      body: `Your last 7 days are ${Math.abs(Math.round(weeklyChange * 100))}% ${up ? 'higher' : 'lower'} than the 7 days before them.`,
      tone: up ? 'warning' : 'positive',
    });
  }

  if (busiestDay && busiestDay.total > 0) {
    insights.push({
      id: 'weekday',
      icon: 'calendar',
      title: `${busiestDay.label} is your money day`,
      body: `${formatMoney(busiestDay.total)} has gone out on ${busiestDay.label}s so far. Plan it, don't panic about it.`,
      tone: 'neutral',
    });
  }

  if (largest) {
    insights.push({
      id: 'largest',
      icon: 'flash',
      title: 'Your biggest single hit',
      body: `${formatMoney(largest.amount)} on ${formatRelativeDay(largest.date)}${
        largest.note ? ` — ${largest.note}` : ''
      }. That one is ${Math.round((largest.amount / Math.max(1, monthTotal)) * 100)}% of the month.`,
      tone: 'neutral',
    });
  }

  const average = monthCount > 0 ? Math.round(monthTotal / monthCount) : 0;
  insights.push({
    id: 'habit',
    icon: 'repeat',
    title: 'Your average ticket',
    body: `You log ${plural(monthCount, 'expense')} this month at roughly ${formatMoney(average)} each.`,
    tone: 'neutral',
  });

  return insights;
}

export function buildWeeklySummary(input: {
  expenses: Expense[];
  monthTotal: number;
  weeklyTotal: number;
  topCategory: { label: string } | null;
}): string {
  const { monthTotal, weeklyTotal, topCategory, expenses } = input;

  if (expenses.length === 0) {
    return 'No expenses yet — add one and your weekly summary will appear here.';
  }

  return [
    `This week you spent ${formatMoney(weeklyTotal)}, taking your month to ${formatMoney(monthTotal)}.`,
    topCategory ? `${topCategory.label} is your biggest bucket right now.` : '',
    `That is ${plural(expenses.filter((item) => formatRelativeDay(item.date) === 'Today').length, 'entry')} logged today.`,
    'Keep tagging categories and these notes get sharper every week.',
  ]
    .filter(Boolean)
    .join(' ');
}
