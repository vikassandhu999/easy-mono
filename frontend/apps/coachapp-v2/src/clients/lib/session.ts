import type {TrainingPerformedSet, TrainingSession} from '@/api/training-plans-list';

type SnapshotExercise = NonNullable<
  NonNullable<TrainingSession['prescription_snapshot']>['workout']['exercises']
>[number];

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

function performedSetKey(set: TrainingPerformedSet): string {
  return set.snapshot_exercise_ref ?? set.exercise_id ?? `name:${set.exercise_name}`;
}

function plannedExerciseSets(
  exercise: SnapshotExercise,
): Array<{loadUnit: null | string; loadValue: null | string; targetReps: null | string}> {
  return exercise.sets.map((planned) => ({
    loadUnit: planned.load_unit ?? null,
    loadValue: planned.load_value != null ? String(planned.load_value) : null,
    targetReps: planned.reps ?? null,
  }));
}

function snapshotExercises(session: TrainingSession): SnapshotExercise[] {
  return [...(session.prescription_snapshot?.workout.exercises ?? [])].sort(
    (left, right) => left.position - right.position,
  );
}

/**
 * Group a session's performed sets into per-exercise rows, aligned to the
 * versioned Prescription snapshot when the session was planned.
 */
export function buildExerciseGroups(session: TrainingSession): ExerciseGroup[] {
  const planned = snapshotExercises(session);
  const groupMap = new Map<string, TrainingPerformedSet[]>();
  const groupOrder: string[] = [];

  for (const set of [...session.performed_sets].sort((a, b) => a.position - b.position)) {
    const key = performedSetKey(set);
    const existing = groupMap.get(key);
    if (existing) {
      existing.push(set);
    } else {
      groupMap.set(key, [set]);
      groupOrder.push(key);
    }
  }

  if (planned.length === 0) {
    return groupOrder.map((key) => {
      const setsForGroup = groupMap.get(key) ?? [];
      return {
        exerciseId: key,
        exerciseName: performedSetName(setsForGroup[0]!),
        isAdded: false,
        plannedSets: [],
        sets: setsForGroup,
      };
    });
  }

  const matchedKeys = new Set<string>();
  const groups: ExerciseGroup[] = [];

  for (const exercise of planned) {
    const matchKey =
      (exercise.ref && groupOrder.find((key) => key === exercise.ref && !matchedKeys.has(key))) ||
      groupOrder.find((key) => {
        if (matchedKeys.has(key)) {
          return false;
        }
        const first = groupMap.get(key)?.[0];
        return first != null && performedSetName(first) === exercise.exercise_name;
      });
    const setsForExercise = matchKey ? (groupMap.get(matchKey) ?? []) : [];
    if (matchKey) {
      matchedKeys.add(matchKey);
    }

    groups.push({
      exerciseId: matchKey ?? exercise.ref,
      exerciseName: exercise.exercise_name,
      isAdded: false,
      plannedSets: plannedExerciseSets(exercise),
      sets: setsForExercise,
    });
  }

  for (const key of groupOrder) {
    if (matchedKeys.has(key)) {
      continue;
    }
    const setsForGroup = groupMap.get(key) ?? [];
    groups.push({
      exerciseId: key,
      exerciseName: performedSetName(setsForGroup[0]!),
      isAdded: true,
      plannedSets: [],
      sets: setsForGroup,
    });
  }

  return groups;
}

export function sessionWorkoutName(session: TrainingSession): string {
  return session.prescription_snapshot?.workout.name ?? 'Workout';
}
