export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

const monthFormatter = new Intl.DateTimeFormat('en-ZA', { month: 'long', year: 'numeric' });
const longDayFormatter = new Intl.DateTimeFormat('en-ZA', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const shortDayFormatter = new Intl.DateTimeFormat('en-ZA', { weekday: 'short' });
const dayNumberFormatter = new Intl.DateTimeFormat('en-ZA', { day: 'numeric' });

export function formatMonth(date: Date): string {
  return monthFormatter.format(date);
}

export function formatLongDay(key: string): string {
  return longDayFormatter.format(fromDateKey(key));
}

export function formatWeekday(key: string): string {
  return shortDayFormatter.format(fromDateKey(key)).slice(0, 2);
}

export function formatDayNumber(key: string): string {
  return dayNumberFormatter.format(fromDateKey(key));
}

/** `Today`, `Yesterday`, or a readable date for anything older. */
export function formatRelativeDay(key: string): string {
  const target = fromDateKey(key);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()) /
      86_400_000
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return shortDayFormatter.format(target);
  return longDayFormatter.format(target);
}

/** The last `count` days, newest first — used by the date picker row. */
export function recentDayKeys(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - index);
    return toDateKey(day);
  });
}
