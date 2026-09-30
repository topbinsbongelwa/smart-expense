import type { CategoryId, Expense } from '@/constants/categories';
import { formatRelativeDay, fromDateKey, toDateKey } from '@/lib/date';

const KEYWORDS: Record<CategoryId, string[]> = {
  food: [
    'lunch', 'dinner', 'breakfast', 'coffee', 'tea', 'groceries', 'grocery', 'supermarket',
    'restaurant', 'takeaway', 'braai', 'pizza', 'burger', 'sushi', 'chicken', 'spur', 'nandos',
    'kfc', 'mcdonald', 'starbucks', 'costas', 'shoprite', 'checkers', 'pick n pay', 'food',
  ],
  transport: [
    'taxi', 'uber', 'bolt', 'bus', 'train', 'fuel', 'petrol', 'diesel', 'parking', 'toll',
    'flight', 'airline', 'car wash', 'licence', 'car',
  ],
  housing: ['rent', 'mortgage', 'bond', 'lease', 'house', 'landlord'],
  bills: [
    'electric', 'electricity', 'eskom', 'water', 'internet', 'wifi', 'fibre', 'vodacom', 'mtn',
    'telkom', 'insurance', 'subscription', 'netflix', 'spotify', 'showmax', 'dstv', 'bill',
    'phone',
  ],
  health: ['pharmacy', 'clinic', 'doctor', 'dentist', 'hospital', 'medical', 'medicine', 'meds', 'gym'],
  fun: ['cinema', 'movies', 'concert', 'club', 'festival', 'bowling', 'game', 'games', 'sport', 'hike'],
  shopping: [
    'shoes', 'clothes', 'shirt', 'dress', 'mall', 'store', 'gift', 'laptop', 'phone case',
    'electronics', 'ikea', 'fashion', 'haircut', 'salon',
  ],
  other: [],
};

const CATEGORY_ORDER: CategoryId[] = [
  'food',
  'transport',
  'housing',
  'bills',
  'health',
  'fun',
  'shopping',
  'other',
];

/** Reads a typed note and guesses the bucket it belongs in. */
export function suggestCategory(note: string): CategoryId | null {
  const text = note.trim().toLowerCase();
  if (text.length === 0) return null;

  let best: { categoryId: CategoryId; index: number } | null = null;

  for (const categoryId of CATEGORY_ORDER) {
    for (const keyword of KEYWORDS[categoryId]) {
      const index = text.indexOf(keyword);
      if (index !== -1 && (best === null || index < best.index)) {
        best = { categoryId, index };
      }
    }
  }

  return best?.categoryId ?? null;
}

export type DuplicateFlag = {
  id: string;
  amount: number;
  categoryId: CategoryId;
  dates: string[];
};

/** Same bucket, same amount, logged within 48 hours — almost always a double tap. */
export function findDuplicates(expenses: Expense[]): DuplicateFlag[] {
  const groups = new Map<string, Expense[]>();

  for (const expense of expenses) {
    const key = `${expense.categoryId}|${expense.amount}`;
    groups.set(key, [...(groups.get(key) ?? []), expense]);
  }

  const flags: DuplicateFlag[] = [];

  for (const [key, group] of groups) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date));
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = fromDateKey(sorted[index - 1].date);
      const current = fromDateKey(sorted[index].date);
      const gapDays = Math.round((current.getTime() - previous.getTime()) / 86_400_000);
      if (gapDays <= 2) {
        flags.push({
          id: key,
          amount: sorted[index].amount,
          categoryId: sorted[index].categoryId,
          dates: [sorted[index - 1].date, sorted[index].date],
        });
        break;
      }
    }
  }

  return flags;
}

export type RecurringPattern = {
  id: string;
  categoryId: CategoryId;
  label: string;
  average: number;
  occurrences: number;
  nextDate: string;
};

/** Finds month-ish repeats inside a single category and estimates the next hit. */
export function detectRecurring(expenses: Expense[]): RecurringPattern[] {
  const patterns: RecurringPattern[] = [];
  const byCategory = new Map<CategoryId, Expense[]>();

  for (const expense of expenses) {
    byCategory.set(expense.categoryId, [...(byCategory.get(expense.categoryId) ?? []), expense]);
  }

  for (const [categoryId, group] of byCategory) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date));

    let chain: Expense[] = [];
    const flush = () => {
      if (chain.length >= 2) {
        const last = chain[chain.length - 1];
        const total = chain.reduce((sum, item) => sum + item.amount, 0);
        const next = fromDateKey(last.date);
        const nextDate = new Date(next.getFullYear(), next.getMonth(), next.getDate() + 30);
        patterns.push({
          id: `${categoryId}-${chain.length}-${last.date}`,
          categoryId,
          label: last.note.length > 0 ? last.note : categoryId,
          average: Math.round(total / chain.length),
          occurrences: chain.length,
          nextDate: toDateKey(nextDate),
        });
      }
      chain = [];
    };

    for (const expense of sorted) {
      if (chain.length === 0) {
        chain = [expense];
        continue;
      }
      const previous = fromDateKey(chain[chain.length - 1].date);
      const current = fromDateKey(expense.date);
      const gapDays = Math.round((current.getTime() - previous.getTime()) / 86_400_000);
      const amountRatio = expense.amount / Math.max(1, chain[0].amount);
      const similarAmount = amountRatio > 0.85 && amountRatio < 1.15;

      if (gapDays >= 20 && gapDays <= 40 && similarAmount) {
        chain.push(expense);
      } else {
        flush();
        chain = [expense];
      }
    }
    flush();
  }

  return patterns.sort((a, b) => a.nextDate.localeCompare(b.nextDate)).slice(0, 3);
}

export type Anomaly = { key: string; total: number; multiple: number };

/** Flags a single day that blew past the user's own normal spending. */
export function findAnomalousDay(expenses: Expense[], windowDays = 14, threshold = 1.8): Anomaly | null {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const totals = new Map<string, number>();

  for (let offset = 0; offset < windowDays; offset += 1) {
    const date = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - offset);
    totals.set(toDateKey(date), 0);
  }

  for (const expense of expenses) {
    if (totals.has(expense.date)) {
      totals.set(expense.date, (totals.get(expense.date) ?? 0) + expense.amount);
    }
  }

  const values = [...totals.values()];
  const active = values.filter((value) => value > 0);
  if (active.length < 4) return null;

  const average = active.reduce((sum, value) => sum + value, 0) / active.length;
  if (average <= 0) return null;

  let worst: Anomaly | null = null;
  for (const [key, value] of totals) {
    const multiple = value / average;
    if (value > 0 && multiple >= threshold && (!worst || multiple > worst.multiple)) {
      worst = { key, total: value, multiple };
    }
  }

  return worst;
}

export type SmartTag = {
  id: string;
  note: string;
  suggested: CategoryId;
  current: CategoryId;
};

/** Entries where the note clearly implies a different bucket than the one used. */
export function suggestRetags(expenses: Expense[], limit = 2): SmartTag[] {
  const tags: SmartTag[] = [];

  for (const expense of expenses) {
    if (expense.note.trim().length === 0) continue;
    const suggested = suggestCategory(expense.note);
    if (suggested && suggested !== expense.categoryId) {
      tags.push({
        id: expense.id,
        note: expense.note,
        suggested,
        current: expense.categoryId,
      });
      if (tags.length >= limit) break;
    }
  }

  return tags;
}

/** The classic "safe to spend" number: what's left divided by the days that are left. */
export function safeToSpendToday(input: {
  goal: number;
  spent: number;
  daysElapsed: number;
  daysInMonth: number;
}): { amount: number; daysLeft: number; remaining: number } {
  const remaining = input.goal - input.spent;
  const daysLeft = Math.max(0, input.daysInMonth - input.daysElapsed);
  const amount = daysLeft > 0 ? Math.round(remaining / daysLeft) : remaining;
  return { amount: Math.max(0, amount), daysLeft, remaining };
}

export function describeDuplicate(flag: DuplicateFlag): string {
  const [first, second] = flag.dates.map(formatRelativeDay);
  return `${second} repeats ${first} at the same amount`;
}
