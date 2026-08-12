import {formatTimeAgo, parseIsoDateToDate} from '@easy/utils';

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

/** Workbench row subtitle for the client's coaching engagement. */
export function formatSubscriptionEnd(value: null | string | undefined, now = new Date()): string {
  const date = toDate(value);
  if (!date) {
    return 'No end date';
  }

  const days = Math.round((startOfLocalDay(date).getTime() - startOfLocalDay(now).getTime()) / DAY_MS);

  if (days < 0) {
    return days === -1 ? 'Coaching period ended yesterday' : `Coaching period ended ${Math.abs(days)} days ago`;
  }
  if (days === 0) {
    return 'Coaching period ends today';
  }
  if (days === 1) {
    return 'Coaching period ends tomorrow';
  }
  return `Coaching period ends in ${days} days`;
}

/** Null-guarding wrapper over @easy/utils — the API fields this reads are nullable. */
export function formatRelativeTime(value: null | string | undefined): string {
  return value ? formatTimeAgo(value) : '';
}

/** COPY.md §DB eyebrow — `TUESDAY · JUL 15` (the caller uppercases). */
export function formatDashboardDate(date = new Date()): string {
  const weekday = new Intl.DateTimeFormat('en', {weekday: 'long'}).format(date);
  const calendarDate = new Intl.DateTimeFormat('en', {day: 'numeric', month: 'short'}).format(date);
  return `${weekday} · ${calendarDate}`;
}
