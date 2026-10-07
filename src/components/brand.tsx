import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { APP_LOGO, BRAND_MARK_PATH, BRAND_MARK_STROKE_WIDTH } from '@/constants/logo';
import { Brand, Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function BrandGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d={BRAND_MARK_PATH}
        fill="none"
        stroke={Brand.white}
        strokeWidth={BRAND_MARK_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BrandMark({
  size = 44,
  logo = APP_LOGO,
  onBrand = false,
}: {
  size?: number;
  logo?: ImageSource | null;
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
          borderRadius: size * 0.3,
          backgroundColor: onBrand ? 'rgba(255,255,255,0.14)' : theme.background,
          borderColor: onBrand ? 'rgba(255,255,255,0.32)' : theme.border,
        },
        onBrand ? null : styles.markShadow,
      ]}>
      {logo ? (
        <Image
          source={logo}
          style={{ width: size * 0.72, height: size * 0.72 }}
          contentFit="contain"
        />
      ) : (
        <View
          style={[
            styles.tile,
            {
              width: size * 0.8,
              height: size * 0.8,
              borderRadius: size * 0.24,
              backgroundColor: onBrand ? 'rgba(255,255,255,0.18)' : 'transparent',
            },
            onBrand ? null : styles.tileGradient,
          ]}>
          <BrandGlyph size={size * 0.62} />
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
  markShadow: {
    boxShadow: '0 6px 16px rgba(8, 64, 42, 0.14)',
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileGradient: {
    experimental_backgroundImage: Brand.gradientFab,
  },
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
