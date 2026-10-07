import { Image } from 'expo-image';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { APP_LOGO } from '@/constants/logo';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <Image
      accessibilityLabel="Woolworths shopping bags"
      contentFit="contain"
      source={APP_LOGO}
      style={{ width: size, height: size }}
    />
  );
}

export function Wordmark({ subtitle, color }: { subtitle?: string; color?: string }) {
  const theme = useTheme();
  return (
    <View>
      <Text style={[styles.wordmark, { color: color ?? theme.text }]}>Iskhwama</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: color ?? theme.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function BrandHeader({ style, ...rest }: ViewProps) {
  return (
    <View style={[styles.row, style]} {...rest}>
      <BrandMark />
      <Wordmark subtitle="Smart money, every day" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wordmark: {
    fontFamily: Fonts.sans,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
