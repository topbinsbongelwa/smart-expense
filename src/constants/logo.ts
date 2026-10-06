import type { ImageSource } from 'expo-image';

/**
 * Optional image override for BrandMark. `null` renders the built-in vector
 * mark; swap in `require('@/assets/images/your-logo.png')` to rebrand every
 * BrandMark in the app with a custom image.
 */
export const APP_LOGO: ImageSource | null = null;
