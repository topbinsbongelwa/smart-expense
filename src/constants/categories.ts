import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

export type CategoryId =
  | 'food'
  | 'transport'
  | 'housing'
  | 'bills'
  | 'health'
  | 'fun'
  | 'shopping'
  | 'other';

export type Category = {
  id: CategoryId;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  color: string;
};

export const CATEGORIES: Category[] = [
  { id: 'food', label: 'Food', icon: 'restaurant', color: '#16A34A' },
  { id: 'transport', label: 'Transport', icon: 'car', color: '#0D9488' },
  { id: 'housing', label: 'Housing', icon: 'home', color: '#3F6212' },
  { id: 'bills', label: 'Bills', icon: 'receipt', color: '#B45309' },
  { id: 'health', label: 'Health', icon: 'medkit', color: '#0E7490' },
  { id: 'fun', label: 'Fun', icon: 'sparkles', color: '#7C3AED' },
  { id: 'shopping', label: 'Shopping', icon: 'bag-handle', color: '#BE185D' },
  { id: 'other', label: 'Other', icon: 'apps', color: '#64748B' },
];

const CATEGORY_MAP = new Map(CATEGORIES.map((category) => [category.id, category]));

export function getCategory(id: CategoryId): Category {
  return CATEGORY_MAP.get(id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export type Expense = {
  id: string;
  /** Stored in cents so totals never drift with floating point. */
  amount: number;
  categoryId: CategoryId;
  note: string;
  /** `YYYY-MM-DD` in the device's local time. */
  date: string;
  createdAt: number;
};
