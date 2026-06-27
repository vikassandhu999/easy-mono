/**
 * Shared helpers for reading a training session's planned_snapshot + performed_sets.
 * Used by the live logger (active-workout) and the read-only history detail so the
 * plan-vs-actual reconstruction stays identical on both sides.
 */
import type {TrainingPerformedSet, TrainingSession} from '@/api/training';

export type SnapshotSet = {
  load_unit?: null | string;
  load_value?: null | string;
  reps?: null | string;
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

// Assign performed sets to exercise occurrences. A performed set carries only
// exercise_id (no per-occurrence key), so a workout with the same exercise twice
// can't tell its occurrences apart by id alone. Consume them greedily in logged
// (position) order: each occurrence claims up to its planned set count.
// ponytail: relies on sets being logged in occurrence order — the linear logger
// (current = first incomplete exercise) guarantees it. Add a workout_element_id
// to the performed set if free-order logging is ever added.
export function assignPerformed(
  exercises: SnapshotExercise[],
  performed: TrainingPerformedSet[],
): TrainingPerformedSet[][] {
  const queues = new Map<string, TrainingPerformedSet[]>();
  for (const p of [...performed].sort((a, b) => a.position - b.position)) {
    const key = p.exercise_id ?? '';
    const q = queues.get(key) ?? [];
    q.push(p);
    queues.set(key, q);
  }
  return exercises.map((ex) => {
    const q = queues.get(ex.exercise_id ?? '');
    return q ? q.splice(0, (ex.sets ?? []).length) : [];
  });
}

// Performed sets whose exercise wasn't in the plan — extras added during the workout.
export function addedExercises(
  exercises: SnapshotExercise[],
  performed: TrainingPerformedSet[],
): Map<string, TrainingPerformedSet[]> {
  const planned = new Set(exercises.map((e) => e.exercise_id ?? ''));
  const extra = new Map<string, TrainingPerformedSet[]>();
  for (const p of [...performed].sort((a, b) => a.position - b.position)) {
    const key = p.exercise_id ?? '';
    if (planned.has(key)) {
      continue;
    }
    const q = extra.get(key) ?? [];
    q.push(p);
    extra.set(key, q);
  }
  return extra;
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
