import {formatDuration} from '@easy/utils';

import type {WorkoutSession} from '@/api/workoutSessions';

export function getWorkoutSessionTitle(session: WorkoutSession): string {
  return session.planned_snapshot ? session.planned_snapshot.workout_name : 'Freestyle workout';
}

export function getWorkoutSessionExerciseCount(session: WorkoutSession): number {
  const exerciseIds = new Set<string>();
  for (const set of session.performed_sets) {
    exerciseIds.add(set.exercise_id);
  }
  return exerciseIds.size;
}

export function getWorkoutSessionReplacedCount(session: WorkoutSession): number {
  if (!session.planned_snapshot) {
    return 0;
  }

  const elementExerciseMap = new Map<string, string>();
  for (const element of session.planned_snapshot.elements) {
    elementExerciseMap.set(element.element_id, element.exercise_id);
  }

  const replacedElements = new Set<string>();
  for (const set of session.performed_sets) {
    if (!set.workout_element_id) {
      continue;
    }
    const plannedExerciseId = elementExerciseMap.get(set.workout_element_id);
    if (plannedExerciseId && plannedExerciseId !== set.exercise_id) {
      replacedElements.add(set.workout_element_id);
    }
  }

  return replacedElements.size;
}

export function getWorkoutSessionPlannedExerciseCount(session: WorkoutSession): null | number {
  return session.planned_snapshot ? session.planned_snapshot.elements.length : null;
}

export function buildWorkoutSessionSubtitle(session: WorkoutSession): string {
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

  const replacedCount = getWorkoutSessionReplacedCount(session);
  if (replacedCount > 0) {
    parts.push(`${replacedCount} replaced`);
  }

  return parts.join(' · ');
}
