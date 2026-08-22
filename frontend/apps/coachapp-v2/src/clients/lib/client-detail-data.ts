/**
 * Derivations behind the Client Detail screens: dates, adherence and the weight
 * trend. Written against the API types and the output formats the dc.html
 * actually displays — every format below is quoted from the design so the
 * expected string is checkable rather than remembered:
 *
 *   CD-OV   `submitted 3d ago` · week strip `W 15` · `Weekly Progress Check · 17 Jul`
 *           `72.4 kg` · `▼ 1.2 kg in 4 weeks` · `goal 68 kg`
 *   CD-TR   `Tue 21 Jul` · `7 exercises · 21 sets · 49m` · `1h 4m` · `This week` / `Last week`
 *   CD-NU   `1,720 / 1,900` · `91%` · `Not logged`
 *   CD-WH   `21 Jul` (no weekday) · `73.0 kg` (trailing zero kept) · `goal 68 kg` (no decimal)
 *
 * Dates from the API are plain `YYYY-MM-DD` day strings, not instants. They are
 * parsed as LOCAL midnight, never `new Date(iso)` — that parses a bare date as
 * UTC and shifts the day backwards for anyone west of Greenwich, which turns
 * "today" into "yesterday" in every adherence strip on the screen.
 */
import type {WeightEntry} from '@/api/clients';
import type {NutritionDay} from '@/api/nutrition-plans-list';
import type {TrainingSession} from '@/api/training-plans-list';

const MS_PER_DAY = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** `YYYY-MM-DD` -> local midnight. See the header note on why this is not `new Date(iso)`. */
export function parseDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Local date -> `YYYY-MM-DD`. Not `toISOString()`, which converts to UTC first. */
export function toDayIso(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** The `n` day-strings ending at `from`, oldest first — the week/adherence strips. */
export function lastNDays(n: number, from: Date = new Date()): [string, ...string[]] {
  const end = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const day = (i: number) => toDayIso(new Date(end.getTime() - (n - 1 - i) * MS_PER_DAY));
  return [day(0), ...Array.from({length: Math.max(0, n - 1)}, (_, i) => day(i + 1))];
}

/**
 * The inclusive `{from, to}` a day window spans — the shape every window-scoped
 * list query takes. Reading the ends off the array is where four screens each
 * asserted `days[0]!`; a non-empty window has ends by construction.
 */
export function dayWindowRange(days: [string, ...string[]]): {from: string; to: string} {
  return {from: days[0], to: days[days.length - 1] ?? days[0]};
}

/** `W`, `T`, `F` … — the week strip's single-letter column head (CD-OV). */
export function weekdayInitial(iso: string): string {
  return (WEEKDAYS[parseDay(iso).getDay()] ?? '').charAt(0);
}

/** `15` — the day number under the initial (CD-OV). */
export function dayOfMonth(iso: string): number {
  return parseDay(iso).getDate();
}

/** `17 Jul` (CD-OV latest check-in, CD-WH rows). */
export function formatDayMonth(iso: string): string {
  const d = parseDay(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** `Tue 21 Jul` with a weekday (CD-TR, CD-NU), `21 Jul` without (CD-WH). */
export function formatRowDate(iso: string, {weekday = true}: {weekday?: boolean} = {}): string {
  const day = formatDayMonth(iso);
  return weekday ? `${WEEKDAYS[parseDay(iso).getDay()]} ${day}` : day;
}

/** `Today` · `Yesterday` · `3d ago` (CD-OV "submitted 3d ago"), else `17 Jul`. */
export function relativeDay(iso: null | string | undefined, today: Date = new Date()): null | string {
  if (!iso) {
    return null;
  }
  const days = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - parseDay(iso).getTime()) / MS_PER_DAY,
  );
  if (days <= 0) {
    return 'Today';
  }
  if (days === 1) {
    return 'Yesterday';
  }
  return days < 7 ? `${days}d ago` : formatDayMonth(iso);
}

/** Monday-based, matching `This week` starting Mon 20 Jul in CD-TR. */
export function startOfWeek(iso: string): string {
  const d = parseDay(iso);
  // getDay() is Sunday-0; shift so Monday is 0 and Sunday is 6.
  const offset = (d.getDay() + 6) % 7;
  return toDayIso(new Date(d.getTime() - offset * MS_PER_DAY));
}

/** `This week` / `Last week` / `Week of 7 Jul` — the CD-TR session group headers. */
export function weekGroupLabel(iso: string, today: Date = new Date()): string {
  const week = startOfWeek(iso);
  const thisWeek = startOfWeek(toDayIso(today));
  if (week === thisWeek) {
    return 'This week';
  }
  const weeksBack = Math.round((parseDay(thisWeek).getTime() - parseDay(week).getTime()) / (7 * MS_PER_DAY));
  return weeksBack === 1 ? 'Last week' : `Week of ${formatDayMonth(week)}`;
}

/** `49m`, `1h 4m` (CD-TR session meta). Null when the session never ended. */
export function formatCompactDuration(startedAt: string, endedAt: null | string | undefined): null | string {
  if (!endedAt) {
    return null;
  }
  const minutes = Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return null;
  }
  const h = Math.floor(minutes / 60);
  return h ? `${h}h ${minutes % 60}m` : `${minutes}m`;
}

/** `1,900` — thousands separated, as every kcal figure in the design is. */
export function formatKcal(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

/**
 * `72.4 kg` / `73.0 kg` — one decimal, trailing zero KEPT (CD-WH shows `73.0 kg`).
 * The goal reads `68 kg`, so it passes `decimals: 0`.
 */
export function formatWeight(value: number | string, unit: string, {decimals = 1}: {decimals?: number} = {}): string {
  return `${Number(value).toFixed(decimals)} ${unit}`;
}

/** Day-strings on which a session was completed — drives the CD-OV workout dots. */
export type CompletedSession = Pick<TrainingSession, 'date' | 'state'>;

export function completedSessionDates(sessions: CompletedSession[] | undefined): Set<string> {
  const dates = new Set<string>();
  for (const s of sessions ?? []) {
    if (s.state === 'completed' && s.date) {
      dates.add(s.date.slice(0, 10));
    }
  }
  return dates;
}

/** Day-strings on which any food was logged — drives the CD-OV meal dots. */
export type NutritionDayLog = Pick<NutritionDay, 'date'> & {
  summary: Pick<NutritionDay['summary'], 'has_intake'> & {
    logged: Pick<NutritionDay['summary']['logged'], 'calories'>;
  };
};

export function loggedMealDates(days: NutritionDayLog[] | undefined): Set<string> {
  const dates = new Set<string>();
  for (const day of days ?? []) {
    if (day.summary.has_intake) {
      dates.add(day.date.slice(0, 10));
    }
  }
  return dates;
}

/** Mean logged kcal across days that were logged at all; null when none were. */
export function averageLoggedCalories(days: NutritionDayLog[] | undefined): null | number {
  const values: number[] = [];
  for (const day of days ?? []) {
    if (!day.summary.has_intake) {
      continue;
    }
    const kcal = day.summary.logged.calories;
    if (kcal == null) {
      continue;
    }
    values.push(kcal);
  }
  if (values.length === 0) {
    return null;
  }
  return Math.round(values.reduce((total, kcal) => total + kcal, 0) / values.length);
}

export type WeightTrendEntry = Pick<WeightEntry, 'date' | 'id' | 'unit' | 'value'>;

export type WeightTrend = {
  /** 'down' | 'up' | 'flat' — the design draws ▼ / ▲ / — from this. */
  direction: 'down' | 'flat' | 'up';
  goal: null | number;
  latest: WeightTrendEntry;
  /** Absolute change, already rounded to the displayed precision. */
  magnitude: number;
  /** Every logged value, oldest first — the CD-OV chart's polyline. */
  series: number[];
  /** Whole weeks between the compared entries — `in 4 weeks`. */
  weeks: number;
};

/**
 * Latest entry vs the oldest one in range, as `▼ 1.2 kg in 4 weeks` (CD-OV).
 * Entries arrive newest-first from the API; this does not assume that and sorts.
 * Null when there is nothing to compare — one entry is not a trend.
 */
export function weightTrend(entries: WeightTrendEntry[] | undefined, goal: null | number = null): null | WeightTrend {
  const sorted = [...(entries ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const [first] = sorted;
  if (!first) {
    return null;
  }
  const latest = sorted[sorted.length - 1] ?? first;
  const series = sorted.map((entry) => Number(entry.value));
  if (sorted.length === 1) {
    return {direction: 'flat', goal, latest, magnitude: 0, series, weeks: 0};
  }
  const change = Number(latest.value) - Number(first.value);
  const magnitude = Math.abs(Math.round(change * 10) / 10);
  return {
    direction: magnitude === 0 ? 'flat' : change < 0 ? 'down' : 'up',
    goal,
    latest,
    magnitude,
    series,
    weeks: Math.max(
      1,
      Math.round((parseDay(latest.date).getTime() - parseDay(first.date).getTime()) / (7 * MS_PER_DAY)),
    ),
  };
}

/** How many assignments a client has actually completed (CD-CI counts). */
export function completedCheckIns(assignments: {status?: null | string}[] | undefined): number {
  return (assignments ?? []).filter((a) => a.status === 'completed').length;
}

/**
 * `points` for the CD-WH trend polyline, oldest value on the left. A flat series
 * is drawn down the vertical middle rather than dividing by a zero range.
 */
export function sparklinePoints(values: number[], width: number, height: number): string {
  if (values.length === 0) {
    return '';
  }
  if (values.length === 1) {
    return `0,${height / 2} ${width},${height / 2}`;
  }
  const min = Math.min(...values);
  const range = Math.max(...values) - min;
  const stepX = width / (values.length - 1);
  return values
    .map((v, i) => {
      const y = range === 0 ? height / 2 : height - ((v - min) / range) * height;
      return `${Math.round(i * stepX * 100) / 100},${Math.round(y * 100) / 100}`;
    })
    .join(' ');
}

/**
 * The CD-OV weight chart: the polyline, its end point and the goal line all share
 * ONE scale, so the goal is drawn in view even when it sits below every logged
 * value — `sparklinePoints` can't do that, since it only knows the values.
 * Inset 10 top and bottom so the extremes aren't clipped by the stroke width.
 */
export function weightChartGeometry(
  values: number[],
  goal: null | number,
  width: number,
  height: number,
): null | {goalY: null | number; points: string} {
  if (values.length === 0) {
    return null;
  }
  const inset = 10;
  const span = [...values, ...(goal == null ? [] : [goal])];
  const min = Math.min(...span);
  const range = Math.max(...span) - min || 1;
  const y = (value: number) => round(height - inset - ((value - min) / range) * (height - inset * 2));
  const stepX = values.length === 1 ? 0 : width / (values.length - 1);

  return {
    goalY: goal == null ? null : y(goal),
    points: values.map((value, index) => `${round(index * stepX)},${y(value)}`).join(' '),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
