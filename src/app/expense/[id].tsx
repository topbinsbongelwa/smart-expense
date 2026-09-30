import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { CategoryPicker } from '@/components/category-picker';
import { DayStrip } from '@/components/day-strip';
import { NumberPad } from '@/components/number-pad';
import type { CategoryId } from '@/constants/categories';
import { getCategory } from '@/constants/categories';
import { MaxContentWidth, Radius } from '@/constants/theme';
import { useExpenses } from '@/hooks/use-expenses';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeDay, todayKey } from '@/lib/date';
import { successFeedback } from '@/lib/haptics';
import { centsToInput, formatMoney, parseMoneyInput } from '@/lib/money';

const NEW_ROUTE = 'new';

export default function ExpenseEditorScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, hydrated, addExpense, updateExpense, removeExpense } = useExpenses();
  const params = useLocalSearchParams<{ id?: string | string[]; date?: string | string[] }>();

  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const requestedDate = Array.isArray(params.date) ? params.date[0] : params.date;
  const isEditing = !!routeId && routeId !== NEW_ROUTE;
  const expense = isEditing ? expenses.find((item) => item.id === routeId) : undefined;

  const [input, setInput] = useState(() => (expense ? centsToInput(expense.amount) : ''));
  const [note, setNote] = useState(() => expense?.note ?? '');
  const [categoryId, setCategoryId] = useState<CategoryId>(() => expense?.categoryId ?? 'food');
  const [date, setDate] = useState(() => expense?.date ?? requestedDate ?? todayKey());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const synced = useRef(false);
  useEffect(() => {
    if (synced.current || !expense) return;
    synced.current = true;
    setInput(centsToInput(expense.amount));
    setNote(expense.note);
    setCategoryId(expense.categoryId);
    setDate(expense.date);
  }, [expense]);

  const amount = parseMoneyInput(input);
  const canSave = amount > 0 && (isEditing ? !!expense : hydrated);

  function save() {
    if (!canSave) return;
    const payload = { amount, categoryId, note: note.trim(), date };

    if (expense) {
      updateExpense(expense.id, payload);
    } else {
      addExpense(payload);
    }
    successFeedback();
    router.back();
  }

  function handleDelete() {
    if (!expense) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    removeExpense(expense.id);
    router.back();
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 8}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.6 : 1 }]}>
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>

          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {expense ? 'Edit expense' : 'New expense'}
          </Text>

          {expense ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmDelete ? 'Confirm delete' : 'Delete expense'}
              onPress={handleDelete}
              hitSlop={12}
              style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.6 : 1 }]}>
              <Ionicons
                name={confirmDelete ? 'trash' : 'trash-outline'}
                size={21}
                color={confirmDelete ? theme.danger : theme.textMuted}
              />
            </Pressable>
          ) : (
            <View style={styles.iconButton} />
          )}
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            <View style={styles.amountBlock}>
              <Text style={[styles.amountLabel, { color: theme.textMuted }]}>Amount</Text>
              <Text
                accessibilityLabel={`Amount ${formatMoney(amount)}`}
                style={[styles.amount, { color: amount > 0 ? theme.text : theme.textMuted }]}>
                {amount > 0 ? formatMoney(amount) : 'R 0.00'}
              </Text>
              <View style={[styles.accentLine, { backgroundColor: getCategory(categoryId).color }]} />
            </View>

            <View
              style={[
                styles.noteField,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: confirmDelete ? theme.danger : 'transparent',
                },
              ]}>
              <Ionicons name="create-outline" size={18} color={theme.textMuted} />
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="What was it for?"
                placeholderTextColor={theme.textMuted}
                maxLength={60}
                returnKeyType="done"
                style={[styles.note, { color: theme.text }]}
              />
            </View>
            {confirmDelete ? (
              <Text style={[styles.confirmHint, { color: theme.danger }]}>
                Tap the bin again to delete permanently
              </Text>
            ) : null}

            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Category</Text>
            <CategoryPicker value={categoryId} onChange={setCategoryId} />

            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Date</Text>
            <DayStrip value={date} onChange={setDate} />
            <Text style={[styles.dateHint, { color: theme.textSecondary }]}>
              {formatRelativeDay(date)}
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.border, paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.padWrapper}>
            <NumberPad value={input} onChange={setInput} />
          </View>
          <AppButton
            label={expense ? 'Save changes' : 'Save expense'}
            icon="checkmark"
            size="lg"
            disabled={!canSave}
            onPress={save}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 14,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  amountBlock: {
    gap: 4,
    alignItems: 'flex-start',
  },
  accentLine: {
    height: 4,
    width: 56,
    borderRadius: 2,
    marginTop: 6,
  },
  amount: {
    fontSize: 46,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  noteField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    borderWidth: 1.5,
  },
  note: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '500',
  },
  confirmHint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: -6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  dateHint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: -6,
  },
  footer: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  padWrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
});
