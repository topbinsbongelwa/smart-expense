import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tapFeedback } from '@/lib/haptics';

type Props = {
  value: string;
  onChange: (next: string) => void;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'] as const;

function appendKey(value: string, key: (typeof KEYS)[number]): string {
  if (key === 'backspace') return value.slice(0, -1);
  if (key === '.') return value.includes('.') ? value : value.length === 0 ? '0.' : `${value}.`;

  const [whole, decimals] = value.split('.');
  if (decimals !== undefined && decimals.length >= 2) return value;
  if (decimals === undefined && whole.replace(/^0+(?=\d)/, '').length >= 8) return value;
  if (value.length === 0) return key;
  if (value === '0') return key;
  return value + key;
}

export function NumberPad({ value, onChange }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.pad}>
      {KEYS.map((key) => {
        const isBackspace = key === 'backspace';

        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={isBackspace ? 'Delete last digit' : key === '.' ? 'Decimal point' : key}
            onPress={() => {
              tapFeedback();
              onChange(appendKey(value, key));
            }}
            style={({ pressed }) => [
              styles.key,
              { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' },
            ]}>
            {isBackspace ? (
              <Ionicons name="backspace-outline" size={24} color={theme.text} />
            ) : (
              <Text style={[styles.keyLabel, { color: theme.text }]}>{key}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  key: {
    width: '33.333%',
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  keyLabel: {
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
});
