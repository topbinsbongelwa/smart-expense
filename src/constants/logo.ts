import type { ImageSource } from 'expo-image';

export const BRAND_MARK_PATH = 'M 15 29 L 27 68 L 44 40 L 60 68 L 76 29';
export const BRAND_MARK_STROKE_WIDTH = 11.5;

/**
 * Optional image override for BrandMark. `null` renders the built-in vector
 * W mark; provide a custom image to rebrand every BrandMark in the app.
 */
export const APP_LOGO: ImageSource | null = null;
