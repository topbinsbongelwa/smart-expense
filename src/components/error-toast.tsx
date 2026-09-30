import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** `null` keeps the banner hidden. */
  message: string | null;
  onDismiss: () => void;
  bottom?: number;
  duration?: number;
};

export function ErrorToast({ message, onDismiss, bottom = 24, duration = 3200 }: Props) {
  const theme = useTheme();

  useEffect(() => {
    if (message === null) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (message === null) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <View
        accessibilityLiveRegion="assertive"
        accessibilityRole="alert"
        style={[
          styles.toast,
          {
            backgroundColor: theme.dangerSoft,
            borderColor: theme.danger,
            shadowColor: theme.shadow,
          },
        ]}>
        <Ionicons name="warning" size={18} color={theme.danger} />
        <View style={styles.body}>
          <Text style={[styles.label, { color: theme.danger }]}>Not available yet</Text>
          <Text style={[styles.message, { color: theme.text }]}>{message}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss the error"
          hitSlop={10}
          onPress={onDismiss}>
          <Ionicons name="close" size={18} color={theme.danger} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 460,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  body: { flex: 1, gap: 2 },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  message: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
});
