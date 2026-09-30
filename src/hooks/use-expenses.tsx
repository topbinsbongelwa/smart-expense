import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { CategoryId, Expense } from '@/constants/categories';

const STORAGE_KEY = 'iskhwama.expenses.v1';
export const MONTHLY_SPEND_TARGET = 6_000_00;

export type NewExpenseInput = Omit<Expense, 'id' | 'createdAt'>;
export type ExpensePatch = Partial<Omit<Expense, 'id' | 'createdAt'>>;

type ExpensesContextValue = {
  expenses: Expense[];
  hydrated: boolean;
  addExpense: (input: NewExpenseInput) => Expense;
  updateExpense: (id: string, patch: ExpensePatch) => void;
  removeExpense: (id: string) => void;
  clearExpenses: () => void;
  restoreSampleData: () => void;
};

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

const SAMPLE: { daysAgo: number; amount: number; categoryId: CategoryId; note: string }[] = [
  { daysAgo: 0, amount: 6_500, categoryId: 'food', note: 'Lunch at the market' },
  { daysAgo: 1, amount: 1_850, categoryId: 'transport', note: 'Taxi to town' },
  { daysAgo: 1, amount: 42_000, categoryId: 'bills', note: 'Electricity' },
  { daysAgo: 2, amount: 3_200, categoryId: 'shopping', note: 'Groceries' },
  { daysAgo: 3, amount: 950, categoryId: 'fun', note: 'Coffee with friends' },
  { daysAgo: 5, amount: 120_000, categoryId: 'housing', note: 'Rent' },
  { daysAgo: 6, amount: 2_400, categoryId: 'health', note: 'Pharmacy' },
  { daysAgo: 9, amount: 15_000, categoryId: 'other', note: 'School fees' },
];

function buildSampleData(now = new Date()): Expense[] {
  const timestamp = now.getTime();
  return SAMPLE.map((item, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - item.daysAgo));
    return {
      id: `sample-${index}`,
      amount: item.amount,
      categoryId: item.categoryId,
      note: item.note,
      date: `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`,
      createdAt: timestamp - index * 1000,
    };
  });
}

function sortByNewest(list: Expense[]): Expense[] {
  return [...list].sort((a, b) =>
    a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1
  );
}

function isExpenseList(value: unknown): value is Expense[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Expense).amount === 'number' &&
        typeof (item as Expense).date === 'string' &&
        typeof (item as Expense).categoryId === 'string'
    )
  );
}

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (!cancelled) {
          setExpenses(isExpenseList(parsed) ? sortByNewest(parsed) : buildSampleData());
        }
      } catch {
        if (!cancelled) setExpenses(buildSampleData());
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(expenses)).catch(() => undefined);
  }, [expenses, hydrated]);

  const addExpense = useCallback((input: NewExpenseInput) => {
    const created: Expense = { ...input, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now() };
    setExpenses((current) => sortByNewest([created, ...current]));
    return created;
  }, []);

  const updateExpense = useCallback((id: string, patch: ExpensePatch) => {
    setExpenses((current) =>
      sortByNewest(current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
    );
  }, []);

  const removeExpense = useCallback((id: string) => {
    setExpenses((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearExpenses = useCallback(() => setExpenses([]), []);

  const restoreSampleData = useCallback(() => setExpenses(buildSampleData()), []);

  const value = useMemo<ExpensesContextValue>(
    () => ({
      expenses,
      hydrated,
      addExpense,
      updateExpense,
      removeExpense,
      clearExpenses,
      restoreSampleData,
    }),
    [expenses, hydrated, addExpense, updateExpense, removeExpense, clearExpenses, restoreSampleData]
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses() {
  const context = useContext(ExpensesContext);
  if (!context) throw new Error('useExpenses must be used inside <ExpensesProvider>');
  return context;
}

export type Summary = {
  monthTotal: number;
  monthCount: number;
  todayTotal: number;
  averagePerDay: number;
  topCategoryId: CategoryId | null;
  topCategoryTotal: number;
  progress: number;
  daysElapsed: number;
  daysInMonth: number;
};

export function useExpenseSummary(expenses: Expense[]): Summary {
  return useMemo(() => {
    const now = new Date();
    const today = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const todayKey = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${today}`.padStart(2, '0')}`;

    let monthTotal = 0;
    let monthCount = 0;
    let todayTotal = 0;
    const perCategory = new Map<CategoryId, number>();

    for (const expense of expenses) {
      if (expense.date === todayKey) todayTotal += expense.amount;
      const [year, month] = expense.date.split('-').map(Number);
      if (year === now.getFullYear() && month === now.getMonth() + 1) {
        monthTotal += expense.amount;
        monthCount += 1;
        perCategory.set(expense.categoryId, (perCategory.get(expense.categoryId) ?? 0) + expense.amount);
      }
    }

    let topCategoryId: CategoryId | null = null;
    let topCategoryTotal = 0;
    for (const [categoryId, total] of perCategory) {
      if (total > topCategoryTotal) {
        topCategoryId = categoryId;
        topCategoryTotal = total;
      }
    }

    return {
      monthTotal,
      monthCount,
      todayTotal,
      averagePerDay: today > 0 ? Math.round(monthTotal / today) : 0,
      topCategoryId,
      topCategoryTotal,
      progress: Math.min(1, monthTotal / MONTHLY_SPEND_TARGET),
      daysElapsed: today,
      daysInMonth,
    };
  }, [expenses]);
}
