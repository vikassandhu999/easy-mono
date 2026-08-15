import type {TrainingPerformedSet, TrainingSession} from '@/api/training-plans-list';

/**
 * Shape of the opaque `planned_snapshot` blob the backend embeds on a
 * TrainingSession. OpenApiSpex models it as `{[key: string]: any}` (it's a
 * JSON map column), so this local type narrows the fields the UI reads. It
 * mirrors `Easy.Sessions.build_snapshot/2`: `{exercises: [{name, position,
 * sets: [...]}]}` (no per-element id / no top-level workout name in the new
 * kebab contract).
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
  return set.exercise_id ?? `name:${set.exercise_name}`;
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
 * The coach history screen still consumes the legacy snapshot projection here;
 * the typed Prescription snapshot is owned by the execution/history rewrite.
 */
export function buildExerciseGroups(session: TrainingSession): ExerciseGroup[] {
  const snapshot = getPlannedSnapshot(session);
  const sets = session.performed_sets;

  // Group performed sets by exercise, preserving first-seen order by position.
  const groupMap = new Map<string, TrainingPerformedSet[]>();
  const groupOrder: string[] = [];
  for (const set of [...sets].sort((a, b) => a.position - b.position)) {
    const key = performedSetKey(set);
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

/**
 * What to call a performed session. A session records WHICH workout it performed,
 * not its name: `planned_snapshot` carries the name for a session logged against a
 * since-changed plan, and for one logged against the LIVE plan the name only exists
 * on the plan's own workouts — hence the optional map. CD-TR rows and CD-SD's title
 * are the same question, so they ask it in one place.
 */
export function sessionWorkoutName(
  session: {planned_snapshot?: unknown; training_workout_id?: null | string},
  workoutNames?: Map<string, string>,
): string {
  const fromPlan = workoutNames?.get(session.training_workout_id ?? '');
  if (fromPlan) {
    return fromPlan;
  }
  const snapshot = session.planned_snapshot;
  if (snapshot && typeof snapshot === 'object') {
    const name = (snapshot as {name?: unknown}).name;
    if (typeof name === 'string' && name) {
      return name;
    }
  }
  return 'Workout';
}
