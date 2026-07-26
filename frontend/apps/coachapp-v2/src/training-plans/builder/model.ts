/**
 * Every branch in the training builder lives here.
 *
 * No React, no cache, no I/O — value in, value out. Two reasons it is worth a
 * file of its own: the set-array algebra is the part that used to be wrong (it
 * was written three times, once per component, each from a different snapshot),
 * and a reader who wants to know what the builder actually *does* can read this
 * one file instead of nine.
 */
import {
  TRAINING_DAY_SHORT_LABELS as DAY_SHORT_LABELS,
  TRAINING_WEEKDAYS as ORDERED_DAYS,
  type TrainingWeekday,
} from '@easy/utils';

import type {TrainingPlan, TrainingPlanItem, TrainingPlanPlannedSet, TrainingPlanWorkout} from '@/api/generated';

export type Day = TrainingWeekday;
export type PlannedSet = TrainingPlanPlannedSet;

export {ORDERED_DAYS};

// ---------------------------------------------------------------------------
// Sets — the array algebra
// ---------------------------------------------------------------------------

const BLANK_SET: PlannedSet = {
  set_type: 'working',
  reps: null,
  load_value: null,
  load_unit: 'kg',
  duration_seconds: null,
  distance_value: null,
  distance_unit: 'meters',
  rpe: null,
  rest_seconds: null,
  notes: null,
};

/** An empty working set — what a brand-new exercise starts with. */
export function blankSet(): PlannedSet {
  return {...BLANK_SET};
}

export function patchSet(sets: PlannedSet[], index: number, patch: Partial<PlannedSet>): PlannedSet[] {
  return sets.map((set, i) => (i === index ? {...set, ...patch} : set));
}

/**
 * A new set copies the previous one, so the coach tweaks rather than re-enters.
 * Blank only when there is nothing to copy.
 */
export function appendSet(sets: PlannedSet[]): PlannedSet[] {
  const previous = sets[sets.length - 1];
  return [...sets, previous ? {...previous} : blankSet()];
}

export function removeSet(sets: PlannedSet[], index: number): PlannedSet[] {
  return sets.filter((_, i) => i !== index);
}

/** `planned_sets` requires at least one — the last set is not removable. */
export function canRemoveSet(sets: PlannedSet[]): boolean {
  return sets.length > 1;
}

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

/** Moves one id to an adjacent slot. Out-of-range moves are a no-op. */
export function moveId(ids: string[], from: number, to: number): string[] {
  const moved = ids[from];
  if (moved === undefined || to < 0 || to >= ids.length) {
    return ids;
  }
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function findWorkout(plan: TrainingPlan, workoutId: string): TrainingPlanWorkout | undefined {
  return plan.workouts.find((workout) => workout.id === workoutId);
}

export function findElement(plan: TrainingPlan, elementId: string) {
  for (const workout of plan.workouts) {
    const element = workout.workout_elements.find((candidate) => candidate.id === elementId);
    if (element) {
      return {workout, element};
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Schedule
//
// A weekday holds at most one workout, and an unscheduled day has NO entry at
// all: `set_day_schedule` deletes the row and inserts a replacement only when a
// workout is given. These helpers mirror that exactly.
// ---------------------------------------------------------------------------

export function daysForWorkout(items: TrainingPlanItem[], workoutId: string): Day[] {
  return ORDERED_DAYS.filter((day) =>
    items.some((item) => item.day_of_week === day && item.training_workout_id === workoutId),
  );
}

export function setScheduleDay(
  items: TrainingPlanItem[],
  day: Day,
  workoutId: string | null,
  planId: string,
): TrainingPlanItem[] {
  const others = items.filter((item) => item.day_of_week !== day);
  if (!workoutId) {
    return others;
  }
  // The server's own row replaces this on the next read, and nothing in the
  // builder reads an entry's id or timestamps — only its day and its workout.
  return [
    ...others,
    {
      id: `optimistic:${day}`,
      day_of_week: day,
      training_plan_id: planId,
      training_workout_id: workoutId,
      inserted_at: '',
      updated_at: '',
    },
  ];
}

/** Deleting a workout takes it off the schedule — the backend cascades. */
export function clearWorkoutFromSchedule(items: TrainingPlanItem[], workoutId: string): TrainingPlanItem[] {
  return items.filter((item) => item.training_workout_id !== workoutId);
}

/** COPY.md § TB. */
export function scheduleLabel(days: Day[]): string {
  if (days.length === 0) {
    return 'Not scheduled yet';
  }
  return `Scheduled: ${days.map((day) => DAY_SHORT_LABELS[day]).join(', ')}`;
}

// ---------------------------------------------------------------------------
// Tracking types
//
// `tracking_type` decides which measures a set has. One table drives both the
// editor (which fields to EDIT) and the row (which measures to SUMMARISE), so
// the two can never disagree about what an exercise tracks.
// ---------------------------------------------------------------------------

export interface TrackedFields {
  showReps: boolean;
  showLoad: boolean;
  showDuration: boolean;
  showDistance: boolean;
  showRpe: boolean;
}

const REPS_AND_LOAD: TrackedFields = {
  showReps: true,
  showLoad: true,
  showDuration: false,
  showDistance: false,
  showRpe: true,
};

const TRACKED_FIELDS: Record<string, TrackedFields> = {
  weight_reps: REPS_AND_LOAD,
  weighted_bodyweight: REPS_AND_LOAD,
  assisted_bodyweight: REPS_AND_LOAD,
  bodyweight_reps: {showReps: true, showLoad: false, showDuration: false, showDistance: false, showRpe: true},
  reps_only: {showReps: true, showLoad: false, showDuration: false, showDistance: false, showRpe: false},
  duration: {showReps: false, showLoad: false, showDuration: true, showDistance: false, showRpe: false},
  weight_duration: {showReps: false, showLoad: true, showDuration: true, showDistance: false, showRpe: false},
  distance_duration: {showReps: false, showLoad: false, showDuration: true, showDistance: true, showRpe: false},
  weight_distance: {showReps: false, showLoad: true, showDuration: false, showDistance: true, showRpe: false},
};

export function fieldsForTrackingType(trackingType: string | null): TrackedFields {
  return TRACKED_FIELDS[trackingType ?? ''] ?? REPS_AND_LOAD;
}

/** COPY.md § TB (Tracking labels) — the chip on the exercise row. */
const TRACKING_LABELS: Record<string, string> = {
  weight_reps: 'Weight & reps',
  bodyweight_reps: 'Bodyweight reps',
  weighted_bodyweight: 'Weighted bodyweight',
  assisted_bodyweight: 'Assisted bodyweight',
  reps_only: 'Reps only',
  duration: 'Duration',
  weight_duration: 'Weight & time',
  distance_duration: 'Distance & time',
  weight_distance: 'Weight & distance',
};

export function trackingTypeLabel(trackingType: string | null): string | null {
  return TRACKING_LABELS[trackingType ?? ''] ?? null;
}

/** The compact form, for the picker's per-row badge. */
const TRACKING_BADGES: Record<string, string> = {
  weight_reps: 'wt+reps',
  reps_only: 'reps',
  duration: 'time',
  distance_duration: 'dist+time',
  bodyweight_reps: 'bw+reps',
  weighted_bodyweight: 'wt+bw',
  assisted_bodyweight: 'asst+bw',
  weight_duration: 'wt+time',
  weight_distance: 'wt+dist',
};

export function trackingTypeBadge(trackingType: string | null): string {
  return TRACKING_BADGES[trackingType ?? ''] ?? trackingType ?? '—';
}

// ---------------------------------------------------------------------------
// Reading typed text
//
// `undefined` means "not saveable yet" — the coach is mid-word. Returning null
// there would wipe the stored value on the way to a valid one.
// ---------------------------------------------------------------------------

export function parseWholeNumber(text: string): number | null | undefined {
  if (text.trim() === '') {
    return null;
  }
  const value = Number.parseInt(text, 10);
  return Number.isNaN(value) ? undefined : value;
}

/** RPE is bounded 1–10 by the API — saving 12 would write, then 422 and revert. */
export function parseRpe(text: string): number | null | undefined {
  if (text.trim() === '') {
    return null;
  }
  const value = Number.parseFloat(text);
  return Number.isNaN(value) || value < 1 || value > 10 ? undefined : value;
}

// ---------------------------------------------------------------------------
// Set summary — the one line under each set row
// ---------------------------------------------------------------------------

const SET_TYPE_LABELS: Record<string, string> = {
  working: 'Working',
  warmup: 'Warm-up',
  dropset: 'Drop',
};

const LOAD_UNIT_LABELS: Record<string, string> = {kg: 'kg', lbs: 'lbs', bodyweight: 'bw'};
const DISTANCE_UNIT_LABELS: Record<string, string> = {km: 'km', miles: 'mi'};

function formatLoad(set: PlannedSet): string | null {
  if (set.load_value == null || set.load_unit == null || set.load_unit === 'none') {
    return null;
  }
  return `${set.load_value}${LOAD_UNIT_LABELS[set.load_unit] ?? set.load_unit}`;
}

export function formatSetSummary(set: PlannedSet, trackingType: string | null): string {
  const fields = fieldsForTrackingType(trackingType);
  const parts: string[] = [SET_TYPE_LABELS[set.set_type ?? 'working'] ?? 'Working'];
  const load = fields.showLoad ? formatLoad(set) : null;

  if (fields.showReps && set.reps != null) {
    parts.push(load ? `${set.reps} × ${load}` : `${set.reps} reps`);
  } else if (load) {
    // Either reps aren't tracked (weight_duration, weight_distance) or they're
    // simply blank — the weight still reads.
    parts.push(load);
  }

  if (fields.showDuration && set.duration_seconds != null) {
    parts.push(`${set.duration_seconds}s`);
  }

  if (fields.showDistance && set.distance_value != null) {
    parts.push(`${set.distance_value}${DISTANCE_UNIT_LABELS[set.distance_unit ?? ''] ?? 'm'}`);
  }

  if (fields.showRpe && set.rpe != null) {
    // rpe is a decimal at the API; Number() drops a trailing ".0".
    parts.push(`RPE ${Number(set.rpe)}`);
  }

  return parts.join(' · ');
}
