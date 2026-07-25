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
import type {MealLog, TrainingSession, WeightEntry} from '@/api/generated';

const MS_PER_DAY = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
export function lastNDays(n: number, from: Date = new Date()): string[] {
  const end = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Array.from({length: n}, (_, i) => toDayIso(new Date(end.getTime() - (n - 1 - i) * MS_PER_DAY)));
}

/** `W`, `T`, `F` … — the week strip's single-letter column head (CD-OV). */
export function weekdayInitial(iso: string): string {
  return WEEKDAYS[parseDay(iso).getDay()]!.charAt(0);
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

/**
 * `3 Mar 2026` — CD-DT's relationship dates (client since, subscription start/end)
 * carry the year, where every list row does not. A subscription window spanning a
 * year boundary is unreadable without it.
 */
export function formatDayMonthYear(iso: string): string {
  return `${formatDayMonth(iso)} ${parseDay(iso).getFullYear()}`;
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

/** The plan a client is currently on, or undefined when they have none. */
export function activePlan<T extends {status?: null | string}>(plans: T[] | undefined): T | undefined {
  return plans?.find((p) => p.status === 'active');
}

/** Day-strings on which a session was completed — drives the CD-OV workout dots. */
export function completedSessionDates(sessions: TrainingSession[] | undefined): Set<string> {
  const dates = new Set<string>();
  for (const s of sessions ?? []) {
    if (s.state === 'completed' && s.date) {
      dates.add(s.date.slice(0, 10));
    }
  }
  return dates;
}

/** Day-strings on which any food was logged — drives the CD-OV meal dots. */
export function loggedMealDates(logs: MealLog[] | undefined): Set<string> {
  const dates = new Set<string>();
  for (const log of logs ?? []) {
    if (log.food_log_entries.length > 0) {
      dates.add(log.date.slice(0, 10));
    }
  }
  return dates;
}

/** Mean logged kcal across days that were logged at all; null when none were. */
export function averageLoggedCalories(logs: MealLog[] | undefined): null | number {
  const perDay = new Map<string, number>();
  for (const log of logs ?? []) {
    if (log.logged_calories == null) {
      continue;
    }
    const day = log.date.slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + log.logged_calories);
  }
  if (perDay.size === 0) {
    return null;
  }
  let total = 0;
  for (const kcal of perDay.values()) {
    total += kcal;
  }
  return Math.round(total / perDay.size);
}

export type WeightTrend = {
  /** 'down' | 'up' | 'flat' — the design draws ▼ / ▲ / — from this. */
  direction: 'down' | 'flat' | 'up';
  goal: null | number;
  latest: WeightEntry;
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
export function weightTrend(entries: WeightEntry[] | undefined, goal: null | number = null): null | WeightTrend {
  if (!entries || entries.length === 0) {
    return null;
  }
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0]!;
  const latest = sorted[sorted.length - 1]!;
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

export type PlannedMealItem = {calories?: null | number; food_name?: null | string};

export type LoggedEntry = {
  food_name?: null | string;
  planned_item_index?: null | number;
};

/**
 * What a client actually did with a planned meal, per the design's three chips.
 *
 * The reconciliation is POSITIONAL: `planned_snapshot.items` is an ordered array and
 * a `FoodLogEntry.planned_item_index` points into it. So —
 *
 *   added    the entry has no `planned_item_index` — it was not in the plan
 *   swapped  the entry fills a planned slot with a DIFFERENT food
 *   skipped  a planned item that no entry references at all
 *
 * `planned_snapshot` is typed `{[key: string]: any}`, so every level is checked
 * rather than cast — a shape change must degrade to "no chips", never throw inside
 * a render.
 */
export function plannedMealItems(snapshot: unknown): PlannedMealItem[] {
  if (!snapshot || typeof snapshot !== 'object') {
    return [];
  }
  const items = (snapshot as {items?: unknown}).items;
  return Array.isArray(items) ? (items as PlannedMealItem[]) : [];
}

/** `null` when the entry simply matches its planned item — the unremarkable case. */
export function entryStatus(entry: LoggedEntry, planned: PlannedMealItem[]): 'added' | 'swapped' | null {
  if (entry.planned_item_index == null) {
    return 'added';
  }
  const slot = planned[entry.planned_item_index];
  // An index pointing outside the snapshot is not a swap — it is an unknown slot,
  // and claiming "swapped" from missing data would be a guess.
  if (!slot?.food_name || !entry.food_name) {
    return null;
  }
  return slot.food_name === entry.food_name ? null : 'swapped';
}

/** Planned items no entry referenced. The design renders these as muted rows. */
export function skippedPlannedItems(
  snapshot: unknown,
  entries: LoggedEntry[],
): {index: number; item: PlannedMealItem}[] {
  const planned = plannedMealItems(snapshot);
  const filled = new Set(entries.map((e) => e.planned_item_index).filter((i): i is number => i != null));
  return planned.flatMap((item, index) => (filled.has(index) ? [] : [{index, item}]));
}

/** The question types a form can hold, from the generated `question_snapshot`. */
export type AnswerType =
  | 'boolean'
  | 'date'
  | 'multi_select'
  | 'number'
  | 'photo'
  | 'rating'
  | 'select'
  | 'text'
  | 'weight';

/**
 * One answer, rendered. Shared by CD-IR, CD-CS and the CD-OV summary — they had
 * three copies and the third one shipped a bug the other two would have too.
 *
 * `photo` is the reason this needs the question TYPE and not just the value: a
 * photo answer is an attachment id, and rendering it as a string puts a raw UUID
 * on screen (it overflowed the CD-OV card). An id is never display text.
 */
export function formatAnswer(value: unknown, type?: AnswerType): string {
  if (type === 'photo') {
    const count = Array.isArray(value) ? value.length : value ? 1 : 0;
    return count === 0 ? '—' : count === 1 ? 'Photo attached' : `${count} photos attached`;
  }
  if (value == null || value === '') {
    return '—';
  }
  if (Array.isArray(value)) {
    return value.length ? value.map(String).join(' · ') : '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

/** True when an answer is worth putting in a one-line summary (CD-OV). */
export function isSummarisableAnswer(value: unknown, type?: AnswerType): boolean {
  return type !== 'photo' && value != null && value !== '' && !(Array.isArray(value) && value.length === 0);
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
