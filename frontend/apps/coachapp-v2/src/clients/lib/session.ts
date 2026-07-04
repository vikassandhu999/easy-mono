import type {TrainingPerformedSet, TrainingSession} from '@/api/generated';

import {getPlannedSnapshot, type PlannedSnapshotExercise} from '@/domain/workout-sessions';

export type ExerciseGroup = {
  exerciseId: string;
  exerciseName: string;
  isAdded: boolean;
  plannedSets: Array<{loadUnit: null | string; loadValue: null | string; targetReps: null | string}>;
  sets: TrainingPerformedSet[];
};

export function formatLoad(value: null | number, unit: null | string): string {
  if (value == null) {
    return '';
  }
  if (unit === 'bodyweight' || unit === 'none') {
    return unit === 'bodyweight' ? 'BW' : '';
  }
  return `${value} ${unit ?? ''}`.trim();
}

function performedSetName(set: TrainingPerformedSet): string {
  return set.exercise?.name ?? set.exercise_name ?? 'Unknown exercise';
}

function plannedExerciseSets(
  exercise: PlannedSnapshotExercise,
): Array<{loadUnit: null | string; loadValue: null | string; targetReps: null | string}> {
  return (exercise.sets ?? []).map((ps) => ({
    loadUnit: ps.load_unit ?? null,
    loadValue: ps.load_value != null ? String(ps.load_value) : null,
    targetReps: ps.reps ?? null,
  }));
}

/**
 * Group a session's performed sets into per-exercise rows, aligning with the
 * planned snapshot where one exists.
 *
 * NOTE: the kebab TrainingSession contract dropped the per-set
 * `workout_element_id` ↔ snapshot `element_id` linkage, so performed sets are
 * grouped by `exercise_id` and matched to planned snapshot exercises by name.
 * Exercise *replacement* detection (which the old element-linked model
 * supported) is no longer derivable and has been removed (see slice report).
 */
export function buildExerciseGroups(session: TrainingSession): ExerciseGroup[] {
  const snapshot = getPlannedSnapshot(session);
  const sets = session.performed_sets;

  // Group performed sets by exercise, preserving first-seen order by position.
  const groupMap = new Map<string, TrainingPerformedSet[]>();
  const groupOrder: string[] = [];
  for (const set of [...sets].sort((a, b) => a.position - b.position)) {
    const key = set.exercise_id;
    const existing = groupMap.get(key);
    if (existing) {
      existing.push(set);
    } else {
      groupMap.set(key, [set]);
      groupOrder.push(key);
    }
  }

  const groups: ExerciseGroup[] = [];

  if (snapshot?.exercises && snapshot.exercises.length > 0) {
    const matchedKeys = new Set<string>();

    // One row per planned exercise, matched to performed sets by exercise name.
    for (const exercise of [...snapshot.exercises].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
      const plannedName = exercise.name ?? 'Unknown exercise';
      const matchKey = groupOrder.find(
        (key) =>
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          !matchedKeys.has(key) && performedSetName((groupMap.get(key) as TrainingPerformedSet[])[0]!) === plannedName,
      );
      const setsForExercise = matchKey ? (groupMap.get(matchKey) ?? []) : [];
      if (matchKey) {
        matchedKeys.add(matchKey);
      }

      groups.push({
        exerciseId: matchKey ?? '',
        exerciseName: plannedName,
        isAdded: false,
        plannedSets: plannedExerciseSets(exercise),
        sets: setsForExercise,
      });
    }

    // Performed exercises with no planned counterpart → added on the fly.
    for (const key of groupOrder) {
      if (matchedKeys.has(key)) {
        continue;
      }
      const setsForGroup = groupMap.get(key) ?? [];
      groups.push({
        exerciseId: key,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        exerciseName: performedSetName(setsForGroup[0]!),
        isAdded: true,
        plannedSets: [],
        sets: setsForGroup,
      });
    }
  } else {
    for (const key of groupOrder) {
      const setsForGroup = groupMap.get(key) ?? [];
      groups.push({
        exerciseId: key,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        exerciseName: performedSetName(setsForGroup[0]!),
        isAdded: false,
        plannedSets: [],
        sets: setsForGroup,
      });
    }
  }

  return groups;
}

export function getAdherenceSummary(
  session: TrainingSession,
  groups: ExerciseGroup[],
): {added: number; completed: number; skipped: number; totalPlanned: number; totalSets: number} {
  const totalPlanned = getPlannedSnapshot(session)?.exercises?.length ?? 0;
  let completed = 0;
  let skipped = 0;
  let added = 0;
  let totalSets = 0;

  for (const group of groups) {
    totalSets += group.sets.length;
    if (group.isAdded) {
      added++;
    } else if (group.sets.length === 0) {
      skipped++;
    } else {
      completed++;
    }
  }

  return {added, completed, skipped, totalPlanned, totalSets};
}
