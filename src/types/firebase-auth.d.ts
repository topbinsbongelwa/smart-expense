import type { AsyncStorageStatic } from '@react-native-async-storage/async-storage';
import type { Persistence } from 'firebase/auth';

/**
 * firebase@12 ships a React Native build of Auth that exports
 * `getReactNativePersistence`, but the package's `types` entry point points at the
 * browser type bundle and omits the symbol, so TypeScript cannot see it.
 * https://github.com/firebase/firebase-js-sdk/issues/9316
 */
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: AsyncStorageStatic): Persistence;
}