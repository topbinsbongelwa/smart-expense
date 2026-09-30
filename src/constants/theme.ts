/**
<<<<<<< HEAD
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
=======
 * Iskhwama design tokens.
 *
 * The palette is built around a deep "clover" green paired with clean white
 * surfaces, so every screen reads as one brand instead of stock React Native.
>>>>>>> 35d1dd8 (Adding home dashboard and AI assitance)
 */

import '@/global.css';

import { Platform } from 'react-native';

<<<<<<< HEAD
export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
=======
export const Brand = {
  green: '#12784A',
  greenDark: '#0B5A36',
  greenDeep: '#08402A',
  greenLight: '#3FBF7F',
  greenTint: '#E7F5EC',
  greenTintStrong: '#CDEBDA',
  white: '#FFFFFF',
  gradientCard: 'linear-gradient(160deg, #17A55C 0%, #0B5A36 100%)',
  gradientFab: 'linear-gradient(160deg, #3FBF7F 0%, #12784A 100%)',
} as const;

export const Colors = {
  light: {
    text: '#0F1A14',
    textSecondary: '#5C6B62',
    textMuted: '#8A9A91',
    onBrand: '#FFFFFF',
    background: '#FFFFFF',
    backgroundElement: '#F3F8F5',
    backgroundSelected: '#E2EFE7',
    backgroundBrand: '#E7F5EC',
    border: '#DDE9E2',
    primary: Brand.green,
    primaryDark: Brand.greenDark,
    primarySoft: Brand.greenTint,
    onPrimarySoft: Brand.greenDark,
    accent: Brand.greenLight,
    danger: '#C0392B',
    dangerSoft: '#FDECEA',
    warning: '#B45309',
    shadow: '#0B5A36',
  },
  dark: {
    text: '#F1F8F4',
    textSecondary: '#9DB0A5',
    textMuted: '#75897D',
    onBrand: '#06281A',
    background: '#0A1310',
    backgroundElement: '#14211B',
    backgroundSelected: '#1D3128',
    backgroundBrand: '#14291F',
    border: '#223429',
    primary: Brand.greenLight,
    primaryDark: Brand.greenLight,
    primarySoft: '#16281F',
    onPrimarySoft: '#9BE8C0',
    accent: Brand.greenTintStrong,
    danger: '#FF7A6B',
    dangerSoft: '#2A1613',
    warning: '#F0B45E',
    shadow: '#000000',
>>>>>>> 35d1dd8 (Adding home dashboard and AI assitance)
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

<<<<<<< HEAD
=======
export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

>>>>>>> 35d1dd8 (Adding home dashboard and AI assitance)
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
