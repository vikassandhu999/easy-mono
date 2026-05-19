import type {PerformedSet, PlannedSnapshotElement, WorkoutSession} from '@/api/workoutSessions';

export type ExerciseGroup = {
  elementId: null | string;
  exerciseId: string;
  exerciseName: string;
  isAdded: boolean;
  isReplacement: boolean;
  originalExerciseName: null | string;
  plannedSets: Array<{loadUnit: null | string; loadValue: null | string; targetReps: null | string}>;
  sets: PerformedSet[];
};

export function formatLoad(value: null | number, unit: null | string): string {
  if (value == null) return '';
  if (unit === 'bodyweight' || unit === 'none') return unit === 'bodyweight' ? 'BW' : '';
  return `${value} ${unit ?? ''}`.trim();
}

export function buildExerciseGroups(session: WorkoutSession): ExerciseGroup[] {
  const snapshot = session.planned_snapshot;
  const sets = session.performed_sets;

  const elementMap = new Map<string, PlannedSnapshotElement>();
  if (snapshot) {
    for (const el of snapshot.elements) {
      elementMap.set(el.element_id, el);
    }
  }

  const groupMap = new Map<string, PerformedSet[]>();
  const groupOrder: string[] = [];

  for (const set of [...sets].sort((a, b) => a.position - b.position)) {
    const key = set.workout_element_id ?? `freestyle_${set.exercise_id}`;
    const existing = groupMap.get(key);
    if (existing) {
      existing.push(set);
    } else {
      groupMap.set(key, [set]);
      groupOrder.push(key);
    }
  }

  const groups: ExerciseGroup[] = [];

  if (snapshot) {
    const processedKeys = new Set<string>();

    for (const el of [...snapshot.elements].sort((a, b) => a.position - b.position)) {
      const key = el.element_id;
      const setsForElement = groupMap.get(key) ?? [];
      processedKeys.add(key);

      const firstSet = setsForElement[0];
      const isReplacement = firstSet ? firstSet.exercise_id !== el.exercise_id : false;

      groups.push({
        elementId: el.element_id,
        exerciseId: firstSet?.exercise_id ?? el.exercise_id,
        exerciseName: isReplacement ? (firstSet?.exercise?.name ?? 'Unknown exercise') : el.exercise_name,
        isAdded: false,
        isReplacement,
        originalExerciseName: isReplacement ? el.exercise_name : null,
        plannedSets: el.planned_sets.map((ps) => ({
          loadUnit: ps.load_unit,
          loadValue: ps.load_value,
          targetReps: ps.target_reps,
        })),
        sets: setsForElement,
      });
    }

    for (const key of groupOrder) {
      if (!processedKeys.has(key) && key.startsWith('freestyle_')) {
        const setsForGroup = groupMap.get(key) ?? [];
        const firstSet = setsForGroup[0];
        groups.push({
          elementId: null,
          exerciseId: firstSet?.exercise_id ?? '',
          exerciseName: firstSet?.exercise?.name ?? 'Unknown exercise',
          isAdded: true,
          isReplacement: false,
          originalExerciseName: null,
          plannedSets: [],
          sets: setsForGroup,
        });
      }
    }
  } else {
    for (const key of groupOrder) {
      const setsForGroup = groupMap.get(key) ?? [];
      const firstSet = setsForGroup[0];
      groups.push({
        elementId: null,
        exerciseId: firstSet?.exercise_id ?? '',
        exerciseName: firstSet?.exercise?.name ?? 'Unknown exercise',
        isAdded: false,
        isReplacement: false,
        originalExerciseName: null,
        plannedSets: [],
        sets: setsForGroup,
      });
    }
  }

  return groups;
}

export function getAdherenceSummary(
  session: WorkoutSession,
  groups: ExerciseGroup[],
): {added: number; completed: number; replaced: number; skipped: number; totalPlanned: number; totalSets: number} {
  const totalPlanned = session.planned_snapshot?.elements.length ?? 0;
  let completed = 0;
  let replaced = 0;
  let skipped = 0;
  let added = 0;
  let totalSets = 0;

  for (const group of groups) {
    totalSets += group.sets.length;
    if (group.isAdded) {
      added++;
    } else if (group.sets.length === 0) {
      skipped++;
    } else if (group.isReplacement) {
      replaced++;
      completed++;
    } else {
      completed++;
    }
  }

  return {added, completed, replaced, skipped, totalPlanned, totalSets};
}
