import {CalendarDate, endOfWeek, getLocalTimeZone, parseAbsoluteToLocal, parseDate, startOfWeek, today} from '@internationalized/date';

export type DayOfWeek = 'fri' | 'mon' | 'sat' | 'sun' | 'thu' | 'tue' | 'wed';

const DEFAULT_FIRST_DAY_OF_WEEK: DayOfWeek = 'mon';
const DEFAULT_LOCALE = 'en-GB';

export type DateOnlyInput = CalendarDate | Date | string;

function isDateOnlyString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function toCalendarDate(value: DateOnlyInput): CalendarDate {
  if (value instanceof CalendarDate) {
    return value;
  }

  if (value instanceof Date) {
    return new CalendarDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (isDateOnlyString(value)) {
    return parseDate(value);
  }

  throw new Error(`Expected a date-only value, received: ${value}`);
}

export function toLocalDate(value: DateOnlyInput, timeZone = getLocalTimeZone()): Date {
  return toCalendarDate(value).toDate(timeZone);
}

export function formatDateISO(value: DateOnlyInput): string {
  return toCalendarDate(value).toString();
}

export function formatDateShort(value: DateOnlyInput, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
  }).format(toLocalDate(value));
}

export function formatDateLong(value: DateOnlyInput, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(toLocalDate(value));
}

export function formatDateDisplay(value: DateOnlyInput, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    weekday: 'long',
  }).format(toLocalDate(value));
}

export function formatWeekday(value: DateOnlyInput, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {weekday: 'long'}).format(toLocalDate(value));
}

export function formatIsoDate(
  iso: string,
  locale = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = parseAbsoluteToLocal(iso);

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(date.toDate());
}

export function formatIsoDateOnly(iso: string, locale?: string, options?: Intl.DateTimeFormatOptions): string {
  const date = parseAbsoluteToLocal(iso);

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(date.toDate());
}

export function formatIsoDateLong(iso: string, locale?: string, options?: Intl.DateTimeFormatOptions): string {
  const date = parseAbsoluteToLocal(iso);

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  }).format(date.toDate());
}

export function formatIsoDateShort(iso: string, locale?: string, options?: Intl.DateTimeFormatOptions): string {
  const date = parseAbsoluteToLocal(iso);

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    ...options,
  }).format(date.toDate());
}

export function addDays(value: DateOnlyInput, days: number): CalendarDate {
  return toCalendarDate(value).add({days});
}

export function shiftDateByDays(value: Date, days: number): Date {
  return addDays(value, days).toDate(getLocalTimeZone());
}

export function isSameDate(a: DateOnlyInput, b: DateOnlyInput): boolean {
  return toCalendarDate(a).compare(toCalendarDate(b)) === 0;
}

export function isTodayDate(value: DateOnlyInput): boolean {
  return isSameDate(value, today(getLocalTimeZone()));
}

export function isFutureDate(value: DateOnlyInput, reference: DateOnlyInput = today(getLocalTimeZone())): boolean {
  return toCalendarDate(value).compare(toCalendarDate(reference)) > 0;
}

export function getCurrentWeekRange(
  reference: DateOnlyInput = today(getLocalTimeZone()),
  locale = DEFAULT_LOCALE,
  firstDayOfWeek: DayOfWeek = DEFAULT_FIRST_DAY_OF_WEEK,
): {from: string; to: string} {
  const date = toCalendarDate(reference);
  return {
    from: startOfWeek(date, locale, firstDayOfWeek).toString(),
    to: endOfWeek(date, locale, firstDayOfWeek).toString(),
  };
}

export function getWeekDates(
  reference: DateOnlyInput = today(getLocalTimeZone()),
  locale = DEFAULT_LOCALE,
  firstDayOfWeek: DayOfWeek = DEFAULT_FIRST_DAY_OF_WEEK,
): string[] {
  const weekStart = startOfWeek(toCalendarDate(reference), locale, firstDayOfWeek);
  return Array.from({length: 7}, (_, index) => weekStart.add({days: index}).toString());
}

export function getDateForWeekdayIndex(
  weekdayIndex: number,
  reference: DateOnlyInput = today(getLocalTimeZone()),
  locale = DEFAULT_LOCALE,
  firstDayOfWeek: DayOfWeek = DEFAULT_FIRST_DAY_OF_WEEK,
): string {
  return startOfWeek(toCalendarDate(reference), locale, firstDayOfWeek).add({days: weekdayIndex}).toString();
}

export function formatTimeAgo(value: string, now = Date.now()): string {
  const diffMs = now - new Date(value).getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) {
    return 'just now';
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }

  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) {
    return `${diffHrs}h ago`;
  }

  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }

  return formatIsoDateShort(value);
}
