import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { formatDayNumber, formatWeekday, recentDayKeys, todayKey } from '@/lib/date';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tapFeedback } from '@/lib/haptics';

type Props = {
  value: string;
  onChange: (key: string) => void;
  days?: number;
};

export function DayStrip({ value, onChange, days = 7 }: Props) {
  const theme = useTheme();
  const today = todayKey();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}>
      {recentDayKeys(days).map((key) => {
        const selected = key === value;
        const isToday = key === today;
        return (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={key}
            onPress={() => {
              tapFeedback();
              onChange(key);
            }}
            style={({ pressed }) => [
              styles.day,
              {
                backgroundColor: selected ? theme.primary : theme.backgroundElement,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <Text style={[styles.weekday, { color: selected ? theme.onBrand : theme.textMuted }]}>
              {isToday ? 'TODAY' : formatWeekday(key)}
            </Text>
            <Text style={[styles.number, { color: selected ? theme.onBrand : theme.text }]}>
              {formatDayNumber(key)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 8,
    paddingRight: 8,
  },
  day: {
    width: 56,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
    gap: 4,
  },
  weekday: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  number: {
    fontSize: 18,
    fontWeight: '700',
  },
});
