/**
 * What an exercise's `tracking_type` means: which measures its sets carry.
 *
 * One list per tracking type, and it drives both the editor (which fields to
 * show) and the row summary (which measures to print) — so the two can never
 * disagree.
 */

import {isOneOf} from '@easy/utils/closed-vocabulary';

import type {components} from '../../../api/schema.ts';

/** The measures a set can carry. `load` and `distance` also own a unit. */
export type FieldKey = 'distance' | 'duration' | 'load' | 'reps' | 'rpe';

/**
 * The tracking vocabulary, from the Prescription contract. The three tables
 * below are keyed on it rather than on `string`, so a tracking type added
 * backend-side fails the build here instead of falling through to the default.
 */
export type TrackingType = NonNullable<components['schemas']['TrainingPlanExercise']['tracking_type']>;

export const TRACKING_TYPES = [
  'weight_reps',
  'bodyweight_reps',
  'weighted_bodyweight',
  'assisted_bodyweight',
  'reps_only',
  'duration',
  'weight_duration',
  'distance_duration',
  'weight_distance',
] as const satisfies readonly TrackingType[];

const REPS_AND_LOAD: FieldKey[] = ['reps', 'load', 'rpe'];

const TRACKED: Record<TrackingType, FieldKey[]> = {
  weight_reps: REPS_AND_LOAD,
  weighted_bodyweight: REPS_AND_LOAD,
  assisted_bodyweight: REPS_AND_LOAD,
  bodyweight_reps: ['reps', 'rpe'],
  reps_only: ['reps'],
  duration: ['duration'],
  weight_duration: ['load', 'duration'],
  distance_duration: ['duration', 'distance'],
  weight_distance: ['load', 'distance'],
};

/** Unknown or absent tracking types fall back to the commonest shape. */
export function fieldsFor(trackingType: null | string): FieldKey[] {
  return isOneOf(TRACKING_TYPES, trackingType) ? TRACKED[trackingType] : REPS_AND_LOAD;
}

export function tracks(trackingType: string | null, field: FieldKey): boolean {
  return fieldsFor(trackingType).includes(field);
}

/** COPY.md § TB (Tracking labels) — the chip on the exercise row. */
const LABELS: Record<TrackingType, string> = {
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

export function trackingTypeLabel(trackingType: null | string): null | string {
  return isOneOf(TRACKING_TYPES, trackingType) ? LABELS[trackingType] : null;
}

/** The compact form, for the picker's per-row badge. */
const BADGES: Record<TrackingType, string> = {
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

export function trackingTypeBadge(trackingType: null | string): string {
  return isOneOf(TRACKING_TYPES, trackingType) ? BADGES[trackingType] : (trackingType ?? '—');
}
