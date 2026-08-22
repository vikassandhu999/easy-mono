/**
 * Shared helpers for reading a training session's Prescription snapshot + performed_sets.
 * Used by the live logger (active-workout) and the read-only history detail so the
 * plan-vs-actual reconstruction stays identical on both sides.
 */
import type {components} from '../api/schema.ts';
import type {TrainingPerformedSet, TrainingSession} from '../api/training.ts';

export type SnapshotSet = components['schemas']['TrainingPlanPlannedSet'];
export type SnapshotExercise = components['schemas']['TrainingSessionSnapshotExercise'];
export type ExercisePick = {id: null | string; name: string; tracking_type: null | string};

type ActiveExerciseCardBase = {
  done: TrainingPerformedSet[];
  exercise: SnapshotExercise;
  id: string;
  logSnapshotRef: null | string;
  name: string;
};

export type ActiveExerciseCard =
  | (ActiveExerciseCardBase & {
      kind: 'planned';
      plannedIndex: number;
      swappedFrom: null | string;
      total: number;
    })
  | (ActiveExerciseCardBase & {
      kind: 'added';
      removable: boolean;
    });

type Snapshot = {exercises?: SnapshotExercise[]; workout_name?: string};

export function snapshotOf(session: TrainingSession): Snapshot {
  const snapshot = session.prescription_snapshot;
  if (!snapshot) {
    return {};
  }

  return {
    workout_name: snapshot.workout.name,
    exercises: snapshot.workout.exercises,
  };
}

export function snapshotExercises(session: TrainingSession): SnapshotExercise[] {
  return [...(snapshotOf(session).exercises ?? [])].sort((a, b) => a.position - b.position);
}

export function assignPerformed(
  exercises: SnapshotExercise[],
  performed: TrainingPerformedSet[],
): TrainingPerformedSet[][] {
  const bySlot: TrainingPerformedSet[][] = exercises.map(() => []);
  const slotByRef = new Map(exercises.map((exercise, index) => [exercise.ref, index]));
  for (const p of [...performed].sort((a, b) => a.position - b.position)) {
    const ref = p.snapshot_exercise_ref;
    if (ref == null) {
      continue;
    }
    const slot = slotByRef.get(ref);
    if (slot != null) {
      bySlot[slot]?.push(p);
    }
  }
  return bySlot;
}

function performedExerciseKey(performed: TrainingPerformedSet): string {
  return performed.exercise_id ?? `name:${performed.exercise_name}`;
}

function pickedExerciseKey(exercise: ExercisePick): string {
  return exercise.id ?? `name:${exercise.name}`;
}

export function addedExercises(
  _exercises: SnapshotExercise[],
  performed: TrainingPerformedSet[],
): Map<string, TrainingPerformedSet[]> {
  const extra = new Map<string, TrainingPerformedSet[]>();
  for (const p of [...performed].sort((a, b) => a.position - b.position)) {
    if (p.snapshot_exercise_ref != null) {
      continue;
    }
    const key = performedExerciseKey(p);
    const q = extra.get(key) ?? [];
    q.push(p);
    extra.set(key, q);
  }
  return extra;
}

function emptySnapshotSet(): SnapshotSet {
  return {
    distance_unit: null,
    distance_value: null,
    duration_seconds: null,
    load_unit: null,
    load_value: null,
    notes: null,
    reps: null,
    rest_seconds: null,
    rpe: null,
    set_type: 'working',
  };
}

export function swapOf(
  exercise: SnapshotExercise,
  sets: TrainingPerformedSet[],
): null | {
  id: null | string;
  name: string;
  trackingType: null | string;
} {
  const swapped = sets.find(
    (performed) =>
      performed.exercise_name !== exercise.exercise_name ||
      (performed.exercise_id != null && exercise.exercise_id != null && performed.exercise_id !== exercise.exercise_id),
  );
  return swapped
    ? {
        id: swapped.exercise_id,
        name: swapped.exercise_name ?? 'Exercise',
        trackingType: swapped.exercise?.tracking_type ?? null,
      }
    : null;
}

export function activeExerciseCards(
  session: TrainingSession,
  edits: {added: readonly ExercisePick[]; swaps: ReadonlyMap<number, ExercisePick>},
): ActiveExerciseCard[] {
  const planned = snapshotExercises(session);
  const assigned = assignPerformed(planned, session.performed_sets);
  const extra = addedExercises(planned, session.performed_sets);
  const cards = planned.map((exercise, index): ActiveExerciseCard => {
    const persistedSwap = swapOf(exercise, assigned[index] ?? []);
    const swap =
      edits.swaps.get(index) ??
      (persistedSwap && {
        id: persistedSwap.id,
        name: persistedSwap.name,
        tracking_type: persistedSwap.trackingType,
      });
    const total = exercise.sets.length;
    const swappedFrom = swap ? exercise.exercise_name : null;
    return {
      done: assigned[index] ?? [],
      exercise: swap
        ? {
            exercise_id: swap.id ?? exercise.exercise_id,
            exercise_name: swap.name,
            position: exercise.position,
            ref: exercise.ref,
            sets: Array.from({length: total}, emptySnapshotSet),
            tracking_type: parseTrackingType(swap.tracking_type),
          }
        : exercise,
      id: `p${index}`,
      kind: 'planned',
      logSnapshotRef: exercise.ref,
      name: swap?.name ?? exercise.exercise_name,
      plannedIndex: index,
      swappedFrom,
      total,
    };
  });

  const additions = new Map<string, ExercisePick>();
  for (const [key, sets] of extra) {
    additions.set(key, {
      id: sets[0]?.exercise_id ?? null,
      name: sets[0]?.exercise_name ?? 'Exercise',
      tracking_type: sets[0]?.exercise?.tracking_type ?? 'weight_reps',
    });
  }
  for (const exercise of edits.added) {
    additions.set(pickedExerciseKey(exercise), exercise);
  }
  for (const [key, exercise] of additions) {
    const done = extra.get(key) ?? [];
    cards.push({
      done,
      exercise: {
        exercise_id: exercise.id ?? '',
        exercise_name: exercise.name,
        position: cards.length,
        ref: '',
        sets: [],
        tracking_type: parseTrackingType(exercise.tracking_type),
      },
      id: `a${key}`,
      kind: 'added',
      logSnapshotRef: null,
      name: exercise.name,
      removable: done.length === 0,
    });
  }
  return cards;
}

export function sessionVolumeKg(performed: TrainingPerformedSet[]): number {
  let kg = 0;
  for (const p of performed) {
    const reps = Number(p.reps);
    if (p.load_value != null && Number.isFinite(reps)) {
      kg += Number(p.load_value) * reps;
    }
  }
  return kg;
}

export function formatVolume(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)}kg`;
}

const SORENESS = ['🙂', '🙂', '😮‍💨', '🥵', '💀'];
export function sorenessEmoji(rating?: null | number): null | string {
  if (rating == null) {
    return null;
  }
  return SORENESS[Math.min(4, Math.max(0, rating - 1))] ?? null;
}

// "Wed · Jun 18" — pass a full ISO datetime (started_at), not a date-only string.
export function formatDayDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString('en-US', {day: 'numeric', month: 'short', weekday: 'short'})
    .replace(', ', ' · ');
}

// ── Tracking types → the 1–2 measurable fields the set block shows ───────────
// Mirrors the backend tracking_type enum + the coach builder (spec 04-set-measurables).
export type FieldKind = 'distance' | 'duration' | 'reps' | 'weight';

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
] as const;

export type TrackingType = (typeof TRACKING_TYPES)[number];

const FIELDS: Record<TrackingType, FieldKind[]> = {
  assisted_bodyweight: ['weight', 'reps'],
  bodyweight_reps: ['reps'],
  distance_duration: ['distance', 'duration'],
  duration: ['duration'],
  reps_only: ['reps'],
  weight_distance: ['weight', 'distance'],
  weight_duration: ['weight', 'duration'],
  weight_reps: ['weight', 'reps'],
  weighted_bodyweight: ['weight', 'reps'],
};

function parseTrackingType(value: null | string | undefined): TrackingType {
  if (value && (TRACKING_TYPES as readonly string[]).includes(value)) {
    return value as TrackingType;
  }
  return 'weight_reps';
}

export function fieldsFor(trackingType?: null | string): FieldKind[] {
  return FIELDS[parseTrackingType(trackingType)];
}

export function unitLabel(unit?: null | string): string {
  return unit === 'lbs' ? 'lb' : unit === 'kg' ? 'kg' : '';
}

function distanceUnitLabel(unit?: null | string): string {
  return unit === 'km' ? 'km' : unit === 'miles' ? 'mi' : 'm';
}

export function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

type SetFields = {
  distance_unit?: null | string;
  distance_value?: null | number | string;
  duration_seconds?: null | number;
  load_unit?: null | string;
  load_value?: null | number | string;
  reps?: null | string;
};

function blank(v: unknown): boolean {
  return v == null || v === '';
}

function weightPart(f: SetFields): null | string {
  if (blank(f.load_value) || f.load_unit === 'none' || f.load_unit === 'bodyweight') {
    return null;
  }
  return `${f.load_value}${unitLabel(f.load_unit)}`;
}

// Renders a planned or performed set the way its tracking_type prescribes:
// weight+reps → "100kg × 8", reps → "12 reps", duration → "0:45",
// distance+time → "500m · 1:52", weight+distance → "40kg · 20m".
export function describeSet(trackingType: null | string | undefined, f: SetFields): string {
  const fields = fieldsFor(trackingType);
  const weight = weightPart(f);
  const reps = blank(f.reps) ? null : String(f.reps);
  const distance = blank(f.distance_value) ? null : `${f.distance_value}${distanceUnitLabel(f.distance_unit)}`;
  const time = f.duration_seconds == null ? null : formatSeconds(f.duration_seconds);

  if (fields.length === 2 && fields[0] === 'weight' && fields[1] === 'reps') {
    return `${weight ?? 'BW'} × ${reps ?? '—'}`;
  }
  if (fields.length === 1 && fields[0] === 'reps') {
    return `${reps ?? '—'} reps`;
  }
  const parts = fields
    .map((k) =>
      k === 'weight' ? weight : k === 'reps' ? (reps ? `${reps} reps` : null) : k === 'distance' ? distance : time,
    )
    .filter(Boolean);
  return parts.join(' · ') || '—';
}

/**
 * The planned number for one tracked field, or null when the plan left it
 * blank. The API sends these as strings for the decimal fields and numbers for
 * the integer ones, and an unset field can arrive as `null` or as `''` — both
 * mean "no target", so both collapse to null here rather than to `NaN` or `0`.
 */
export function plannedValue(planned: SnapshotSet | undefined, kind: FieldKind): null | number {
  if (!planned) {
    return null;
  }
  const raw =
    kind === 'weight'
      ? planned.load_value
      : kind === 'reps'
        ? planned.reps
        : kind === 'distance'
          ? planned.distance_value
          : planned.duration_seconds;
  return raw == null || raw === '' ? null : Number(raw);
}
