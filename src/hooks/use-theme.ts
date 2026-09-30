/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
<<<<<<< HEAD
  const theme = scheme === 'unspecified' ? 'light' : scheme;

  return Colors[theme];
=======

  return scheme === 'dark' ? Colors.dark : Colors.light;
>>>>>>> 35d1dd8 (Adding home dashboard and AI assitance)
}
