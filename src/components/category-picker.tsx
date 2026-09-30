import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CATEGORIES, type CategoryId } from '@/constants/categories';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tapFeedback } from '@/lib/haptics';

type Props = {
  value: CategoryId;
  onChange: (id: CategoryId) => void;
};

export function CategoryPicker({ value, onChange }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.grid}>
      {CATEGORIES.map((category) => {
        const selected = category.id === value;
        return (
          <Pressable
            key={category.id}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={category.label}
            onPress={() => {
              tapFeedback();
              onChange(category.id);
            }}
            style={({ pressed }) => [
              styles.item,
              {
                backgroundColor: selected ? `${category.color}14` : theme.backgroundElement,
                borderColor: selected ? category.color : 'transparent',
                opacity: pressed ? 0.75 : 1,
              },
            ]}>
            <View
              style={[
                styles.icon,
                { backgroundColor: selected ? category.color : `${category.color}1F` },
              ]}>
              <Ionicons
                name={category.icon}
                size={18}
                color={selected ? '#FFFFFF' : category.color}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[styles.label, { color: selected ? theme.text : theme.textSecondary }]}>
              {category.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  item: {
    flexGrow: 1,
    flexBasis: '22%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
