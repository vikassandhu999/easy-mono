import {formatIsoDateOnly, formatIsoDateShort, parseIsoDateToDate} from '@easy/utils';

type DatedRange = {
  end_date: null | string;
  start_date: null | string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dayDiff(a: string, b: string): number {
  return Math.max(0, Math.round((parseIsoDateToDate(b).getTime() - parseIsoDateToDate(a).getTime()) / DAY_MS));
}

export function formatAssignedDate(startDate: null | string): string {
  return startDate ? `Assigned ${formatIsoDateOnly(startDate, undefined, {year: undefined})}` : 'Assigned date not set';
}

export function formatDateRange(startDate: null | string, endDate: null | string): string | null {
  if (startDate && endDate) {
    return `${formatIsoDateShort(startDate)} - ${formatIsoDateOnly(endDate)}`;
  }
  if (startDate) {
    return `From ${formatIsoDateOnly(startDate)}`;
  }
  if (endDate) {
    return `Ends ${formatIsoDateOnly(endDate)}`;
  }
  return null;
}

export function getProgramProgress(plan: DatedRange, now = new Date()) {
  if (!plan.start_date || !plan.end_date) {
    return {
      currentWeek: null,
      endsLabel: plan.end_date ? `Ends ${formatIsoDateOnly(plan.end_date)}` : 'End date not set',
      percent: null,
      totalWeeks: null,
      weekLabel: 'Schedule not set',
    };
  }

  const totalDays = Math.max(1, dayDiff(plan.start_date, plan.end_date) + 1);
  const elapsedDays = clamp(
    Math.round((now.getTime() - parseIsoDateToDate(plan.start_date).getTime()) / DAY_MS) + 1,
    0,
    totalDays,
  );
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
  const currentWeek = clamp(Math.max(1, Math.ceil(elapsedDays / 7)), 1, totalWeeks);
  const percent = clamp(Math.round((elapsedDays / totalDays) * 100), 0, 100);

  return {
    currentWeek,
    endsLabel: `Ends ${formatIsoDateOnly(plan.end_date, undefined, {year: undefined})}`,
    percent,
    totalWeeks,
    weekLabel: `Week ${currentWeek} of ${totalWeeks}`,
  };
}

export function formatNumber(value: null | number | undefined, fallback = '—'): string {
  if (value == null || Number.isNaN(value)) {
    return fallback;
  }
  return new Intl.NumberFormat(undefined, {maximumFractionDigits: 1}).format(value);
}

export function formatStatusLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function softStatusClass(status: string): string {
  if (['active', 'completed'].includes(status)) {
    return 'bg-success-soft text-success-soft-foreground';
  }
  if (['in_progress', 'pending', 'invited'].includes(status)) {
    return 'bg-warning-soft text-warning-soft-foreground';
  }
  return 'bg-default-soft text-default-soft-foreground';
}
