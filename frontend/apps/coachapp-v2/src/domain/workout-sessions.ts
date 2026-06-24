import {formatDuration} from '@easy/utils';

import type {TrainingSession} from '@/api/generated';

/**
 * Shape of the opaque `planned_snapshot` blob the backend embeds on a
 * TrainingSession. OpenApiSpex models it as `{[key: string]: any}` (it's a
 * JSON map column), so this local type narrows the fields the UI reads. It
 * mirrors `Easy.Sessions.build_snapshot/2`: `{exercises: [{name, position,
 * sets: [...]}]}` (no per-element id / no top-level workout name in the new
 * kebab contract — see the slice report for the resulting behaviour change).
 */
export type PlannedSnapshotSet = {
  set_type?: string | null;
  reps?: string | null;
  load_value?: number | null;
  load_unit?: string | null;
  duration_seconds?: number | null;
  distance_value?: number | null;
  distance_unit?: string | null;
  rpe?: number | null;
  rest_seconds?: number | null;
  notes?: string | null;
};

export type PlannedSnapshotExercise = {
  name?: string | null;
  position?: number;
  sets?: PlannedSnapshotSet[];
};

export type PlannedSnapshot = {
  exercises?: PlannedSnapshotExercise[];
};

/** Read the (untyped) planned_snapshot blob as the narrowed PlannedSnapshot shape. */
export function getPlannedSnapshot(session: TrainingSession): null | PlannedSnapshot {
  return (session.planned_snapshot as null | PlannedSnapshot) ?? null;
}

export function getWorkoutSessionTitle(session: TrainingSession): string {
  // The kebab snapshot no longer carries a workout_name; a planned session is
  // titled generically, freestyle sessions keep their label.
  return getPlannedSnapshot(session) ? 'Planned workout' : 'Freestyle workout';
}

function getWorkoutSessionExerciseCount(session: TrainingSession): number {
  const exerciseIds = new Set<string>();
  for (const set of session.performed_sets) {
    exerciseIds.add(set.exercise_id);
  }
  return exerciseIds.size;
}

function getWorkoutSessionPlannedExerciseCount(session: TrainingSession): null | number {
  const snapshot = getPlannedSnapshot(session);
  return snapshot?.exercises ? snapshot.exercises.length : null;
}

export function buildWorkoutSessionSubtitle(session: TrainingSession): string {
  const parts: string[] = [];

  const duration = formatDuration(session.started_at, session.ended_at);
  if (duration) {
    parts.push(duration);
  }

  const plannedCount = getWorkoutSessionPlannedExerciseCount(session);
  const actualCount = getWorkoutSessionExerciseCount(session);

  if (plannedCount !== null) {
    parts.push(`${actualCount}/${plannedCount} exercises`);
  } else if (actualCount > 0) {
    parts.push(`${actualCount} exercise${actualCount !== 1 ? 's' : ''}`);
  }

  return parts.join(' · ');
}
