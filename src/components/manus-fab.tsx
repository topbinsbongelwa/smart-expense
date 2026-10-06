import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';

const BUTTON_SIZE = 56;
/** Matches the wide-screen sidebar tabs so the FAB never sits on top of them. */
const SIDEBAR_WIDTH = 104;
const WIDE_BREAKPOINT = 900;

/** One expanding, fading ripple ring driven by the shared pulse value. */
function GlowRing({ pulse }: { pulse: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.75 }],
    opacity: 0.45 * (1 - pulse.value),
  }));
  return <Animated.View style={[styles.ring, style]} />;
}

/**
 * Floating Manus AI button with a pulsing glow — rendered once from the root
 * layout so it sits above every screen.
 */
export function ManusFab({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pulse = useSharedValue(0);
  const pulseDelayed = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
    pulseDelayed.value = withDelay(
      900,
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false)
    );
  }, [pulse, pulseDelayed]);

  return (
    <View
      style={[
        styles.wrap,
        {
          bottom: insets.bottom + 76,
          left: (width >= WIDE_BREAKPOINT ? SIDEBAR_WIDTH : 0) + 18,
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chat with Manus AI"
        onPress={onPress}
        hitSlop={8}
        style={({ pressed }) => [
          styles.pressable,
          { transform: [{ scale: pressed ? 0.92 : 1 }] },
        ]}>
        <GlowRing pulse={pulse} />
        <GlowRing pulse={pulseDelayed} />
        <View style={styles.button}>
          <Ionicons name="sparkles" size={22} color={Brand.white} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    zIndex: 20,
  },
  pressable: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: Brand.greenLight,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    experimental_backgroundImage: Brand.gradientFab,
    shadowColor: Brand.greenLight,
    shadowOpacity: 0.7,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
});
