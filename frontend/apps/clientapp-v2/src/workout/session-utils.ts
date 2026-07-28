/**
 * Shared helpers for reading a training session's planned_snapshot + performed_sets.
 * Used by the live logger (active-workout) and the read-only history detail so the
 * plan-vs-actual reconstruction stays identical on both sides.
 */
import type {TrainingPerformedSet, TrainingSession} from '@/api/training';

export type SnapshotSet = {
  distance_unit?: null | string;
  distance_value?: null | number | string;
  duration_seconds?: null | number;
  load_unit?: null | string;
  load_value?: null | string;
  reps?: null | string;
  rest_seconds?: null | number;
  rpe?: null | number | string;
  set_type?: null | string;
};
export type SnapshotExercise = {
  exercise_id?: null | string;
  name?: null | string;
  position?: number;
  sets?: SnapshotSet[];
  tracking_type?: null | string;
};
type Snapshot = {exercises?: SnapshotExercise[]; workout_name?: string};

export function snapshotOf(session: TrainingSession): Snapshot {
  return (session.planned_snapshot ?? {}) as Snapshot;
}

export function snapshotExercises(session: TrainingSession): SnapshotExercise[] {
  return [...(snapshotOf(session).exercises ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

// The planned slot a performed set belongs to: its swapped-from exercise when the
// client swapped this slot, else the exercise it was logged under.
function plannedKey(p: TrainingPerformedSet): string {
  return p.swapped_from_exercise_id ?? p.exercise_id ?? '';
}

// Assign performed sets to exercise occurrences.
//
// A set logged by the current app carries `planned_exercise_index` — the snapshot
// slot it was logged under — so it maps back exactly, even when the same exercise
// appears twice in a workout, and even when the slot was swapped.
//
// Rows written before that field existed carry only their (planned-slot) exercise
// id, with no per-occurrence key, so they fall back to the original scheme: consume
// them greedily in logged (position) order, each occurrence claiming up to its
// planned set count. Swapped legacy sets map back via plannedKey.
export function assignPerformed(
  exercises: SnapshotExercise[],
  performed: TrainingPerformedSet[],
): TrainingPerformedSet[][] {
  const bySlot: TrainingPerformedSet[][] = exercises.map(() => []);
  const queues = new Map<string, TrainingPerformedSet[]>();
  for (const p of [...performed].sort((a, b) => a.position - b.position)) {
    const slot = p.planned_exercise_index;
    if (slot != null) {
      bySlot[slot]?.push(p);
      continue;
    }
    const key = plannedKey(p);
    const q = queues.get(key) ?? [];
    q.push(p);
    queues.set(key, q);
  }
  return exercises.map((ex, index) => {
    const exact = bySlot[index] ?? [];
    if (exact.length > 0) {
      return exact;
    }
    const q = queues.get(ex.exercise_id ?? '');
    return q ? q.splice(0, (ex.sets ?? []).length) : [];
  });
}

// Performed sets that belong to no planned slot — extras added during the workout
// (grouped by the exercise actually performed). A set with a planned_exercise_index
// is by definition in a slot; a legacy set is excluded when its plannedKey names a
// planned exercise, which is also how swapped legacy sets stay out.
export function addedExercises(
  exercises: SnapshotExercise[],
  performed: TrainingPerformedSet[],
): Map<string, TrainingPerformedSet[]> {
  const planned = new Set(exercises.map((e) => e.exercise_id ?? ''));
  const extra = new Map<string, TrainingPerformedSet[]>();
  for (const p of [...performed].sort((a, b) => a.position - b.position)) {
    if (p.planned_exercise_index != null || planned.has(plannedKey(p))) {
      continue;
    }
    const key = p.exercise_id ?? '';
    const q = extra.get(key) ?? [];
    q.push(p);
    extra.set(key, q);
  }
  return extra;
}

// If a planned slot's logged sets were swapped, the exercise actually performed.
export function swapOf(sets: TrainingPerformedSet[]): null | {name: string; trackingType: null | string} {
  const swapped = sets.find((p) => p.swapped_from_exercise_id != null);
  return swapped
    ? {name: swapped.exercise_name ?? 'Exercise', trackingType: swapped.exercise?.tracking_type ?? null}
    : null;
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

const FIELDS: Record<string, FieldKind[]> = {
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

export function fieldsFor(trackingType?: null | string): FieldKind[] {
  return FIELDS[trackingType ?? 'weight_reps'] ?? ['weight', 'reps'];
}

export function unitLabel(unit?: null | string): string {
  return unit === 'lbs' ? 'lb' : unit === 'kg' ? 'kg' : '';
}

export function distanceUnitLabel(unit?: null | string): string {
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
