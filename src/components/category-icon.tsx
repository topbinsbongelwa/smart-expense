import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { getCategory, type CategoryId } from '@/constants/categories';
import { Radius } from '@/constants/theme';

type Props = {
  categoryId: CategoryId;
  size?: number;
  selected?: boolean;
};

export function CategoryIcon({ categoryId, size = 44, selected = false }: Props) {
  const category = getCategory(categoryId);
  const iconSize = size * 0.46;

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: selected ? category.color : `${category.color}1F`,
        },
      ]}>
      <Ionicons name={category.icon} size={iconSize} color={selected ? '#FFFFFF' : category.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
});
