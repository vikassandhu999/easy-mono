/**
 * Data derivations for the client-detail (CD) screens — spec:
 * docs/superpowers/specs/2026-07-21-client-detail-ux-spec.md §1.1, §2.2, §3.2.
 * Pure functions only; components own the queries.
 */
import type {ClientProfileFormAssignment, MealLog, TrainingSession, WeightEntry} from '@/api/generated';

const DAY_MS = 24 * 60 * 60 * 1000;

export function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Last `n` calendar days ascending, ending today. */
export function lastDays(n: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({length: n}, (_, i) => new Date(today.getTime() - (n - 1 - i) * DAY_MS));
}

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export function weekdayKey(date: Date): string {
  return WEEKDAY_KEYS[date.getDay()]!;
}

/** `Today`, `Yesterday`, `{n}d ago` up to 7 days, then `15 Jul` (§1.1). */
export function relativeDay(iso: null | string | undefined): null | string {
  if (!iso) {
    return null;
  }
  const then = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thenDay = new Date(then);
  thenDay.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - thenDay.getTime()) / DAY_MS);
  if (days <= 0) {
    return 'Today';
  }
  if (days === 1) {
    return 'Yesterday';
  }
  if (days <= 7) {
    return `${days}d ago`;
  }
  const sameYear = then.getFullYear() === today.getFullYear();
  return then.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', ...(sameYear ? {} : {year: 'numeric'})});
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', ...(sameYear ? {} : {year: 'numeric'})});
}

export function activePlan<T extends {status: string}>(plans: T[] | undefined): T | undefined {
  return plans?.find((plan) => plan.status === 'active');
}

export function completedSessionDates(sessions: TrainingSession[] | undefined): Set<string> {
  const dates = new Set<string>();
  for (const session of sessions ?? []) {
    if (session.state === 'completed' && session.date) {
      dates.add(session.date);
    }
  }
  return dates;
}

/** Days (ISO) with any logged calories. */
export function loggedMealDates(logs: MealLog[] | undefined): Set<string> {
  const dates = new Set<string>();
  for (const log of logs ?? []) {
    if ((log.logged_calories ?? 0) > 0) {
      dates.add(log.date);
    }
  }
  return dates;
}

export function averageLoggedCalories(logs: MealLog[] | undefined): null | number {
  const byDay = new Map<string, number>();
  for (const log of logs ?? []) {
    if ((log.logged_calories ?? 0) > 0) {
      byDay.set(log.date, (byDay.get(log.date) ?? 0) + (log.logged_calories ?? 0));
    }
  }
  if (byDay.size === 0) {
    return null;
  }
  let total = 0;
  for (const calories of byDay.values()) {
    total += calories;
  }
  return Math.round(total / byDay.size);
}

export type WeightDelta = {
  direction: 'down' | 'up';
  /** toward the goal → success, away → danger, no goal / single entry → muted */
  tone: 'danger' | 'muted' | 'success';
  value: number;
};

/** Delta of the latest entry vs the nearest entry ≥28 days older (§2.2 tile 3). */
export function weightDelta(entries: WeightEntry[] | undefined, goal: null | number): null | WeightDelta {
  const sorted = [...(entries ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const latest = sorted[0];
  const oldest = sorted[sorted.length - 1];
  if (!latest || !oldest || sorted.length < 2) {
    return null;
  }
  const latestTime = new Date(`${latest.date}T00:00:00`).getTime();
  const baseline =
    sorted.find((entry) => latestTime - new Date(`${entry.date}T00:00:00`).getTime() >= 28 * DAY_MS) ?? oldest;
  const delta = Number(latest.value) - Number(baseline.value);
  if (Number.isNaN(delta) || delta === 0) {
    return null;
  }
  const towardGoal =
    goal == null ? null : Math.abs(Number(latest.value) - goal) < Math.abs(Number(baseline.value) - goal);
  return {
    direction: delta < 0 ? 'down' : 'up',
    tone: towardGoal == null ? 'muted' : towardGoal ? 'success' : 'danger',
    value: Math.abs(delta),
  };
}

export type SnapshotQuestion = {id?: string; label?: string; type?: string};
export type SnapshotSection = {questions?: SnapshotQuestion[]; title?: string};

export function snapshotQuestions(snapshot: unknown): SnapshotQuestion[] {
  return (Array.isArray(snapshot) ? (snapshot as SnapshotSection[]) : []).flatMap((section) =>
    Array.isArray(section.questions) ? section.questions : [],
  );
}

export function completedCheckIns(
  assignments: ClientProfileFormAssignment[] | undefined,
): ClientProfileFormAssignment[] {
  return (assignments ?? [])
    .filter((a) => a.purpose === 'check_in' && a.latest_submission)
    .sort((a, b) => ((a.latest_submission?.submitted_at ?? '') < (b.latest_submission?.submitted_at ?? '') ? 1 : -1));
}

export function formatKg(value: number | string, unit: string): string {
  const n = Number(value);
  return `${Number.isInteger(n) ? n : n.toFixed(1)} ${unit}`;
}

/**
 * `48m` / `1h 4m` (§1.1). The shared `formatDuration` renders `48 min`, which
 * the CD designs don't use — kept local rather than changing every screen.
 */
export function formatCdDuration(startedAt: string, endedAt: null | string | undefined): null | string {
  if (!endedAt) {
    return null;
  }
  const minutes = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return null;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours === 0 ? `${rest}m` : rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** Monday-based start of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

/** `This week` / `Last week` / `Week of 7 Jul` (§4.2 group headers). */
export function weekGroupLabel(iso: string): string {
  const weekStart = startOfWeek(new Date(`${iso}T00:00:00`));
  const thisWeek = startOfWeek(new Date());
  const diffWeeks = Math.round((thisWeek.getTime() - weekStart.getTime()) / (7 * DAY_MS));
  if (diffWeeks <= 0) {
    return 'This week';
  }
  if (diffWeeks === 1) {
    return 'Last week';
  }
  return `Week of ${formatShortDate(isoDate(weekStart))}`;
}

/** `Tue 21 Jul` (desktop date column) / `Tue 21` (mobile, inline in the meta line). */
export function formatRowDate(iso: string, {withMonth}: {withMonth: boolean}): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    weekday: 'short',
    ...(withMonth ? {month: 'short'} : {}),
  });
}

/** Polyline points for a weight sparkline, oldest → newest, fitted to a box. */
export function sparklinePoints(values: number[], width: number, height: number): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const top = height * 0.14;
  const bottom = height * 0.7;
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width : (index / (values.length - 1)) * width;
      return `${Math.round(x)},${Math.round(bottom - ((value - min) / span) * (bottom - top))}`;
    })
    .join(' ');
}
