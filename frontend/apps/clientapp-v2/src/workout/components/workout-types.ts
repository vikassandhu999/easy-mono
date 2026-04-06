import type {ClientPerformedSet, PlannedSnapshotElement, PlannedSnapshotSet} from '@/api/workoutSessions';

export type ExerciseStatus = 'done' | 'in_progress' | 'not_started' | 'skipped';

/** A single exercise slot in the active workout UI */
export type WorkoutExercise = {
  /** The exercise currently assigned (may differ from planned if replaced) */
  exerciseId: string;
  exerciseName: string;
  /** True if this exercise was added by the client (not in the plan) */
  isAdded: boolean;
  /** True if exerciseId differs from the planned exercise */
  isReplaced: boolean;
  /** Original exercise name from the plan (only set when replaced) */
  originalExerciseName: null | string;
  /** Planned sets from snapshot (empty for freestyle/added exercises) */
  plannedSets: PlannedSnapshotSet[];
  /** Performed sets already logged for this slot */
  sets: ClientPerformedSet[];
  status: ExerciseStatus;
  /** The planned workout element ID (null for freestyle/added exercises) */
  workoutElementId: null | string;
};

/** Derive exercise status from planned sets and performed sets */
export function deriveExerciseStatus(
  plannedSets: PlannedSnapshotSet[],
  performedSets: ClientPerformedSet[],
  isSkipped: boolean,
): ExerciseStatus {
  if (isSkipped) return 'skipped';
  if (performedSets.length === 0) return 'not_started';
  if (plannedSets.length > 0 && performedSets.length >= plannedSets.length) return 'done';
  if (performedSets.length > 0) return 'in_progress';
  return 'not_started';
}

/** Build WorkoutExercise list from snapshot + performed sets */
export function buildWorkoutExercises(
  elements: PlannedSnapshotElement[],
  performedSets: ClientPerformedSet[],
  skippedElementIds: Set<string>,
  addedExercises: Array<{exerciseId: string; exerciseName: string}>,
  replacements: Map<string, {exerciseId: string; exerciseName: string}>,
): WorkoutExercise[] {
  // Group performed sets by workout_element_id
  const setsByElement = new Map<string, ClientPerformedSet[]>();
  const freestyleSets = new Map<string, ClientPerformedSet[]>();

  for (const set of performedSets) {
    if (set.workout_element_id) {
      const existing = setsByElement.get(set.workout_element_id);
      if (existing) {
        existing.push(set);
      } else {
        setsByElement.set(set.workout_element_id, [set]);
      }
    } else {
      const existing = freestyleSets.get(set.exercise_id);
      if (existing) {
        existing.push(set);
      } else {
        freestyleSets.set(set.exercise_id, [set]);
      }
    }
  }

  const exercises: WorkoutExercise[] = [];

  // Planned exercises from snapshot
  for (const el of [...elements].sort((a, b) => a.position - b.position)) {
    const replacement = replacements.get(el.element_id);
    const isReplaced = replacement != null;
    const sets = setsByElement.get(el.element_id) ?? [];
    const isSkipped = skippedElementIds.has(el.element_id);

    // When replaced, keep reps/rest scheme but clear load (different exercise = different weight)
    const plannedSets = isReplaced
      ? el.planned_sets.map((ps) => ({...ps, load_unit: null, load_value: null}))
      : el.planned_sets;

    exercises.push({
      exerciseId: isReplaced ? replacement.exerciseId : el.exercise_id,
      exerciseName: isReplaced ? replacement.exerciseName : el.exercise_name,
      isAdded: false,
      isReplaced,
      originalExerciseName: isReplaced ? el.exercise_name : null,
      plannedSets,
      sets: [...sets].sort((a, b) => a.position - b.position),
      status: deriveExerciseStatus(el.planned_sets, sets, isSkipped),
      workoutElementId: el.element_id,
    });
  }

  // Added (freestyle) exercises
  for (const added of addedExercises) {
    const sets = freestyleSets.get(added.exerciseId) ?? [];
    exercises.push({
      exerciseId: added.exerciseId,
      exerciseName: added.exerciseName,
      isAdded: true,
      isReplaced: false,
      originalExerciseName: null,
      plannedSets: [],
      sets: [...sets].sort((a, b) => a.position - b.position),
      status: sets.length > 0 ? 'in_progress' : 'not_started',
      workoutElementId: null,
    });
  }

  return exercises;
}
