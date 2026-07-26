/**
 * What an exercise's `tracking_type` means: which measures its sets carry.
 *
 * One list per tracking type, and it drives both the editor (which fields to
 * show) and the row summary (which measures to print) — so the two can never
 * disagree. It used to be nine records of five booleans, which is the same
 * information written five times as wide.
 */

/** The measures a set can carry. `load` and `distance` also own a unit. */
export type FieldKey = 'distance' | 'duration' | 'load' | 'reps' | 'rpe';

const REPS_AND_LOAD: FieldKey[] = ['reps', 'load', 'rpe'];

const TRACKED: Record<string, FieldKey[]> = {
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
export function fieldsFor(trackingType: string | null): FieldKey[] {
  return TRACKED[trackingType ?? ''] ?? REPS_AND_LOAD;
}

export function tracks(trackingType: string | null, field: FieldKey): boolean {
  return fieldsFor(trackingType).includes(field);
}

/** COPY.md § TB (Tracking labels) — the chip on the exercise row. */
const LABELS: Record<string, string> = {
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
  return LABELS[trackingType ?? ''] ?? null;
}

/** The compact form, for the picker's per-row badge. */
const BADGES: Record<string, string> = {
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
  return BADGES[trackingType ?? ''] ?? trackingType ?? '—';
}
