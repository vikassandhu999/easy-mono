/**
 * A set list, as values. The array algebra plus the one-line summary under each
 * row. No React, no cache — this is the part that used to be written three
 * times, once per component, each from a different snapshot.
 */
import type {TrainingPlanPlannedSet} from '@/api/generated';

import {tracks} from './tracking';

export type PlannedSet = TrainingPlanPlannedSet;

const BLANK: PlannedSet = {
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
  return {...BLANK};
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
// Summary — the one line under each set row
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
  const parts: string[] = [SET_TYPE_LABELS[set.set_type ?? 'working'] ?? 'Working'];
  const load = tracks(trackingType, 'load') ? formatLoad(set) : null;

  if (tracks(trackingType, 'reps') && set.reps != null) {
    parts.push(load ? `${set.reps} × ${load}` : `${set.reps} reps`);
  } else if (load) {
    // Either reps aren't tracked (weight_duration, weight_distance) or they're
    // simply blank — the weight still reads.
    parts.push(load);
  }

  if (tracks(trackingType, 'duration') && set.duration_seconds != null) {
    parts.push(`${set.duration_seconds}s`);
  }

  if (tracks(trackingType, 'distance') && set.distance_value != null) {
    parts.push(`${set.distance_value}${DISTANCE_UNIT_LABELS[set.distance_unit ?? ''] ?? 'm'}`);
  }

  if (tracks(trackingType, 'rpe') && set.rpe != null) {
    // rpe is a decimal at the API; Number() drops a trailing ".0".
    parts.push(`RPE ${Number(set.rpe)}`);
  }

  return parts.join(' · ');
}
