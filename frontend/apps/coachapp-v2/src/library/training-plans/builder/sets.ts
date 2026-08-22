/**
 * A set list, as values: the array algebra plus the one-line summary under each
 * row. No React, no cache.
 */
import type {TrainingPlanPlannedSet} from '../../../api/training-plan-builder.ts';

import {tracks} from './tracking.ts';

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
  return /^\d+$/.test(text) ? Number(text) : undefined;
}

/** RPE is bounded 1–10 by the API — saving 12 would write, then 422 and revert. */
export function parseRpe(text: string): number | null | undefined {
  if (text.trim() === '') {
    return null;
  }
  if (!/^(?:\d+|\d*\.\d+)$/.test(text)) {
    return undefined;
  }
  const value = Number(text);
  return value < 1 || value > 10 ? undefined : value;
}

// ---------------------------------------------------------------------------
// Summary — the one line under each set row
// ---------------------------------------------------------------------------

// The builder's set vocabulary, once — the summary line and the set editor's
// toggle/unit chips both read these (COPY.md: `Working|Warm-up|Drop`, `80kg`,
// units kg/lbs/bw and m/km/mi). Entry order is the editor's display order.
// The session-detail screen deliberately says `Drop set` / `80 kg` — that is
// the Client Detail design's copy, not a drifted copy of this table.
export const SET_TYPE_LABELS = {working: 'Working', warmup: 'Warm-up', dropset: 'Drop'} as const;
export const LOAD_UNIT_LABELS = {kg: 'kg', lbs: 'lbs', bodyweight: 'bw'} as const;
export const DISTANCE_UNIT_LABELS = {meters: 'm', km: 'km', miles: 'mi'} as const;

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
    const unit = set.distance_unit == null || set.distance_unit === 'none' ? 'meters' : set.distance_unit;
    parts.push(`${set.distance_value}${DISTANCE_UNIT_LABELS[unit]}`);
  }

  if (tracks(trackingType, 'rpe') && set.rpe != null) {
    // rpe is a decimal at the API; Number() drops a trailing ".0".
    parts.push(`RPE ${Number(set.rpe)}`);
  }

  return parts.join(' · ');
}
