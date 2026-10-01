/**
 * Turns Firebase auth failures into copy a person can act on. Firebase messages
 * are developer-facing, so nothing here leaks the raw error to the UI.
 */

const MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
  'auth/invalid-email': 'That email address does not look right.',
  'auth/missing-email': 'Add your email address.',
  'auth/missing-password': 'Add your password.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/invalid-login-credentials': 'Email or password is incorrect.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/invalid-password': 'That password is not valid.',
  'auth/weak-password': 'Pick a stronger password: 8+ characters with at least one number.',
  'auth/user-disabled': 'That account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute, then try again.',
  'auth/network-request-failed': 'No connection. Check your data and try again.',
  'auth/operation-not-allowed': 'Email sign-in is not switched on for this project yet.',
  'auth/requires-recent-login': 'Sign in again to make that change.',
};

export function describeAuthError(error: unknown, fallback = 'Something went wrong. Try again.') {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: unknown }).code);
    const known = MESSAGES[code];
    if (known) return known;
  }
  return fallback;
}