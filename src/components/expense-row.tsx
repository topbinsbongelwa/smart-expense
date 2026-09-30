import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCategory, type Expense } from '@/constants/categories';
import { CategoryIcon } from '@/components/category-icon';
import { formatRelativeDay } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  expense: Expense;
  onPress?: (expense: Expense) => void;
  /** Draws the bottom hairline — turn off for the last row in a list. */
  divider?: boolean;
};

export function ExpenseRow({ expense, onPress, divider = true }: Props) {
  const theme = useTheme();
  const category = getCategory(expense.categoryId);
  const title = expense.note.length > 0 ? expense.note : category.label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatMoney(expense.amount)}`}
      onPress={() => onPress?.(expense)}
      style={({ pressed }) => [
        styles.row,
        { borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0, borderBottomColor: theme.border },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <CategoryIcon categoryId={expense.categoryId} size={38} />

      <View style={styles.body}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
          {title}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: theme.textMuted }]}>
          {category.label} · {formatRelativeDay(expense.date)}
        </Text>
      </View>

      <Text style={[styles.amount, { color: theme.text }]}>{formatMoney(expense.amount)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
});
