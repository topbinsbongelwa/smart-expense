const currencyFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeFormatter = new Intl.NumberFormat('en-ZA', {
  maximumFractionDigits: 0,
});

/** Turns cents into a full currency string, e.g. `R 1 234.50`. */
export function formatMoney(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

/** Drops the decimals for headline numbers, e.g. `R 12 340`. */
export function formatMoneyWhole(cents: number): string {
  const amount = Math.round(Math.abs(cents) / 100);
  return `R ${wholeFormatter.format(amount)}`;
}

export function formatNumber(value: number): string {
  return wholeFormatter.format(Math.round(value));
}

/** Builds a cents amount from the digits typed on the custom keypad. */
export function parseMoneyInput(value: string): number {
  const normalised = value.replace(',', '.');
  if (normalised.length === 0) return 0;
  const amount = Number(normalised);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

/** Inverse of `parseMoneyInput`, used to seed the keypad when editing. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
