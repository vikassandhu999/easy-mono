import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/**
 * Format an ISO date (YYYY-MM-DD) to a readable string with weekday, month, and day.
 * Falls back to the raw input if parsing fails.
 */
export function formatIsoDate(isoDate: string): string {
  const dt = dayjs.utc(isoDate);
  if (!dt.isValid()) return isoDate;

  return dt.format('ddd, MMM D');
}

/**
 * Format an ISO date (YYYY-MM-DD) to a short string with weekday and day number.
 * Falls back to the raw input if parsing fails.
 */
export function formatShortDate(isoDate: string): string {
  const dt = dayjs.utc(isoDate);
  if (!dt.isValid()) return isoDate;

  return dt.format('ddd D');
}

/**
 * Check if the given ISO date (YYYY-MM-DD) is today (UTC).
 */
export function isToday(isoDate: string): boolean {
  const dt = dayjs.utc(isoDate);
  if (!dt.isValid()) return false;

  const today = dayjs.utc().startOf('day');
  return dt.startOf('day').isSame(today);
}
