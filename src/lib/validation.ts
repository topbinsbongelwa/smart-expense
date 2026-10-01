/** Shared form rules so the screens and the auth layer agree on what "valid" means. */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normaliseEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(normaliseEmail(value));
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Passwords need at least 8 characters.';
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return 'Mix in at least one letter and one number.';
  }
  return null;
}