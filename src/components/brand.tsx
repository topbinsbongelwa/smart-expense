import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { Brand } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function BrandMark({
  size = 44,
  logo,
  onBrand = false,
}: {
  size?: number;
  logo?: ImageSource;
  onBrand?: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
          backgroundColor: onBrand ? 'rgba(255,255,255,0.18)' : theme.background,
          borderColor: onBrand ? 'rgba(255,255,255,0.3)' : theme.border,
        },
      ]}>
      {logo ? (
        <Image source={logo} style={{ width: size * 0.72, height: size * 0.72 }} contentFit="contain" />
      ) : (
        <View style={[styles.tile, { width: size * 0.58, height: size * 0.58, borderRadius: size * 0.2 }]}>
          <Ionicons name="cash" size={size * 0.3} color="#FFFFFF" />
        </View>
      )}
    </View>
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
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    experimental_backgroundImage: Brand.gradientFab,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
});
