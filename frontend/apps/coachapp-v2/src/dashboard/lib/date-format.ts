import {formatIsoDateShort, formatTimeAgo, parseIsoDateToDate} from '@easy/utils';

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value: null | string | undefined): Date | null {
  if (!value) {
    return null;
  }

  try {
    return parseIsoDateToDate(value);
  } catch {
    return null;
  }
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isInCurrentCalendarMonth(value: null | string | undefined, now = new Date()): boolean {
  const date = toDate(value);
  return Boolean(date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth());
}

export function compareDateStrings(a: null | string | undefined, b: null | string | undefined): number {
  const aTime = toDate(a)?.getTime();
  const bTime = toDate(b)?.getTime();

  if (aTime === undefined && bTime === undefined) {
    return 0;
  }
  if (aTime === undefined) {
    return 1;
  }
  if (bTime === undefined) {
    return -1;
  }
  return aTime - bTime;
}

export function formatDaysUntil(value: null | string | undefined, now = new Date()): string {
  const date = toDate(value);
  if (!date) {
    return 'No end date';
  }

  const days = Math.round((startOfLocalDay(date).getTime() - startOfLocalDay(now).getTime()) / DAY_MS);

  if (days < 0) {
    return days === -1 ? 'Ended yesterday' : `Ended ${Math.abs(days)} days ago`;
  }
  if (days === 0) {
    return 'Ends today';
  }
  if (days === 1) {
    return 'Ends tomorrow';
  }
  return `Ends in ${days} days`;
}

/** Null-guarding wrappers over @easy/utils — the API fields these read are nullable. */
export function formatShortDate(value: null | string | undefined): string {
  return value ? formatIsoDateShort(value) : 'No date';
}

export function formatRelativeTime(value: null | string | undefined): string {
  return value ? formatTimeAgo(value) : '';
}

export function formatDashboardDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(date);
}
