import {formatIsoDateLong, formatIsoDateShort, parseIsoDateToDate} from './date';

// ── Day helpers (weekday mapping for training plans) ────────

export const TRAINING_WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type TrainingWeekday = (typeof TRAINING_WEEKDAYS)[number];

export const TRAINING_DAY_LABELS: Record<TrainingWeekday, string> = {
  friday: 'Friday',
  monday: 'Monday',
  saturday: 'Saturday',
  sunday: 'Sunday',
  thursday: 'Thursday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
};

export const TRAINING_DAY_SHORT_LABELS: Record<TrainingWeekday, string> = {
  friday: 'Fri',
  monday: 'Mon',
  saturday: 'Sat',
  sunday: 'Sun',
  thursday: 'Thu',
  tuesday: 'Tue',
  wednesday: 'Wed',
};

const TRAINING_DAY_INDEX = new Map<TrainingWeekday, number>(TRAINING_WEEKDAYS.map((day, index) => [day, index]));

export function getTrainingWeekdayFromDate(date: Date): TrainingWeekday {
  const jsDay = date.getDay();
  const index = jsDay === 0 ? 6 : jsDay - 1;
  return TRAINING_WEEKDAYS[index] ?? 'monday';
}

export function compareTrainingWeekdays(a: TrainingWeekday, b: TrainingWeekday): number {
  return (TRAINING_DAY_INDEX.get(a) ?? 0) - (TRAINING_DAY_INDEX.get(b) ?? 0);
}

export const DAY_NAMES: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

// ── Session state chip config ────────────────────────────────

export const SESSION_STATE_CHIP: Record<string, {color: 'danger' | 'default' | 'success' | 'warning'; label: string}> =
  {
    active: {color: 'warning', label: 'In Progress'},
    completed: {color: 'success', label: 'Completed'},
    discarded: {color: 'default', label: 'Discarded'},
  };

// ── Duration formatting ──────────────────────────────────────

function formatMinutes(mins: number): string {
  if (mins < 1) {
    return '<1 min';
  }
  if (mins < 60) {
    return `${mins} min`;
  }
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

export function formatDuration(startedAt: string, endedAt: null | string): null | string {
  if (!endedAt) {
    return null;
  }
  const diffMs = parseIsoDateToDate(endedAt).getTime() - parseIsoDateToDate(startedAt).getTime();
  return formatMinutes(Math.round(diffMs / 60_000));
}

export function formatDurationFromNow(startedAt: string): string {
  const diffMs = Date.now() - parseIsoDateToDate(startedAt).getTime();
  return formatMinutes(Math.round(diffMs / 60_000));
}

// ── Date formatting ──────────────────────────────────────────

export function formatSessionDate(dateString: string): string {
  return formatIsoDateShort(dateString);
}

export function formatSessionDateLong(dateString: string): string {
  return formatIsoDateLong(dateString);
}

// ── Workout title ────────────────────────────────────────────

export function getWorkoutTitle(snapshot: null | {workout_name: string}): string {
  return snapshot ? snapshot.workout_name : 'Freestyle workout';
}

// ── Plan item / workout helpers ──────────────────────────────
// Shared between coach and client apps. Generic over the exact item/workout
// types so each app can use its own `ClientTrainingPlanItem` / `TrainingPlanItem`.

/**
 * Sort order for plan items within a day: primary workouts before alternatives,
 * then by creation time. Used by weekly schedule renders in both apps.
 */
const WORKOUT_TYPE_ORDER: Record<'alternative' | 'primary', number> = {
  alternative: 1,
  primary: 0,
};

type PlanItemLike = {
  inserted_at: string;
  workout_type: 'alternative' | 'primary';
};

export function sortPlanItems<T extends PlanItemLike>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const diff = WORKOUT_TYPE_ORDER[a.workout_type] - WORKOUT_TYPE_ORDER[b.workout_type];
    if (diff !== 0) {
      return diff;
    }
    return a.inserted_at.localeCompare(b.inserted_at);
  });
}

/** Build an id→workout lookup map from a plan's workouts array. */
export function buildWorkoutMap<W extends {id: string}>(workouts: W[]): Map<string, W> {
  const map = new Map<string, W>();
  for (const workout of workouts) {
    map.set(workout.id, workout);
  }
  return map;
}

type WorkoutIdItem = {workout_id: string};

/** List the sorted weekdays a given workout is scheduled on. */
export function getWorkoutUsedOnDays<T extends WorkoutIdItem & {day: TrainingWeekday}>(
  planItems: T[],
  workoutId: string,
): TrainingWeekday[] {
  const days = new Set<TrainingWeekday>();
  for (const item of planItems) {
    if (item.workout_id === workoutId) {
      days.add(item.day);
    }
  }
  return [...days].sort(compareTrainingWeekdays);
}

/** Human-readable short-form summary of the weekdays a workout is used on. */
export function formatUsedOnDays(days: TrainingWeekday[]): string {
  if (days.length === 0) {
    return '';
  }
  return days.map((day) => TRAINING_DAY_SHORT_LABELS[day]).join(', ');
}
