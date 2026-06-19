import {
  compareTrainingWeekdays,
  formatUsedOnDays,
  getWorkoutUsedOnDays,
  sortPlanItems,
  TRAINING_WEEKDAYS,
} from '@easy/utils';

import type {TrainingPlan, TrainingPlanItem, TrainingWeekday, Workout} from '@/api/trainingPlans';

export type DayState =
  | {items: [TrainingPlanItem, ...TrainingPlanItem[]]; kind: 'assigned'}
  | {kind: 'empty'}
  | {kind: 'rest'};

export function createWorkoutsById(workouts: Workout[]): Map<string, Workout> {
  const map = new Map<string, Workout>();
  for (const workout of workouts) {
    map.set(workout.id, workout);
  }
  return map;
}

export function createPlanItemsByDay(planItems: TrainingPlanItem[]): Map<TrainingWeekday, TrainingPlanItem[]> {
  const map = new Map<TrainingWeekday, TrainingPlanItem[]>();
  for (const day of TRAINING_WEEKDAYS) {
    map.set(day, []);
  }
  for (const item of planItems) {
    map.get(item.day)?.push(item);
  }
  for (const [day, items] of map) {
    map.set(day, sortPlanItems(items));
  }
  return map;
}

export function createRestDaysSet(restDays: TrainingWeekday[]): Set<TrainingWeekday> {
  return new Set(restDays);
}

export function createDayStates({
  planItemsByDay,
  restDays,
}: {
  planItemsByDay: Map<TrainingWeekday, TrainingPlanItem[]>;
  restDays: Set<TrainingWeekday>;
}): Map<TrainingWeekday, DayState> {
  const map = new Map<TrainingWeekday, DayState>();
  for (const day of TRAINING_WEEKDAYS) {
    const items = planItemsByDay.get(day) ?? [];
    const [first, ...rest] = items;
    if (first) {
      map.set(day, {items: [first, ...rest], kind: 'assigned'});
    } else if (restDays.has(day)) {
      map.set(day, {kind: 'rest'});
    } else {
      map.set(day, {kind: 'empty'});
    }
  }
  return map;
}

export function summarizeDayStates(dayStates: Map<TrainingWeekday, DayState>): {
  empty: number;
  rest: number;
  workouts: number;
} {
  let workouts = 0;
  let rest = 0;
  let empty = 0;
  for (const state of dayStates.values()) {
    if (state.kind === 'assigned') {
      workouts += 1;
    } else if (state.kind === 'rest') {
      rest += 1;
    } else {
      empty += 1;
    }
  }
  return {empty, rest, workouts};
}

export function buildWeeklySummaryLabel(summary: {empty: number; rest: number; workouts: number}): string {
  return `${summary.workouts} workout${summary.workouts !== 1 ? 's' : ''} · ${summary.rest} rest${summary.rest !== 1 ? ' days' : ' day'} · ${summary.empty} empty`;
}

export function getAssignedDays(
  planItems: TrainingPlanItem[],
  excludedDay: TrainingWeekday,
): Array<[TrainingWeekday, TrainingPlanItem]> {
  const map = new Map<TrainingWeekday, TrainingPlanItem>();
  for (const item of planItems) {
    if (item.workout_type === 'primary' && !map.has(item.day)) {
      map.set(item.day, item);
    }
  }
  return [...map.entries()].filter(([day]) => day !== excludedDay).sort(([a], [b]) => compareTrainingWeekdays(a, b));
}

export function getTakenPrimaryDays(planItems: TrainingPlanItem[]): Set<TrainingWeekday> {
  const set = new Set<TrainingWeekday>();
  for (const item of planItems) {
    if (item.workout_type === 'primary') {
      set.add(item.day);
    }
  }
  return set;
}

export function buildRestDaysUpdate(restDays: TrainingWeekday[], day: TrainingWeekday): TrainingWeekday[] {
  return [...new Set([day, ...restDays])].sort(compareTrainingWeekdays);
}

export function buildClearRestDayUpdate(restDays: TrainingWeekday[], day: TrainingWeekday): TrainingWeekday[] {
  return [...new Set(restDays.filter((value) => value !== day))].sort(compareTrainingWeekdays);
}

export function sortWorkoutsByName(workouts: Workout[]): Workout[] {
  return [...workouts].sort((a, b) => a.name.localeCompare(b.name));
}

export function getWorkoutUsageLabel(planItems: TrainingPlanItem[], workoutId: string): null | string {
  const usedOnDays = getWorkoutUsedOnDays(planItems, workoutId);
  return usedOnDays.length > 0 ? formatUsedOnDays(usedOnDays) : null;
}

export function getPrimaryAssignedItem(state: Extract<DayState, {kind: 'assigned'}>): TrainingPlanItem {
  return state.items.find((item) => item.workout_type === 'primary') ?? state.items[0];
}

export function getRowContentMeta({state, workoutsById}: {state: DayState; workoutsById: Map<string, Workout>}): {
  exerciseCount: number;
  isIncomplete: boolean;
  isMissing: boolean;
  workout: Workout | null;
  alternativeCount: number;
} | null {
  if (state.kind !== 'assigned') {
    return null;
  }
  const primary = getPrimaryAssignedItem(state);
  const alternatives = state.items.filter((item) => item.id !== primary.id);
  const workout = workoutsById.get(primary.workout_id) ?? null;
  const exerciseCount = workout?.workout_elements.length ?? 0;
  return {
    alternativeCount: alternatives.length,
    exerciseCount,
    isIncomplete: Boolean(workout) && exerciseCount === 0,
    isMissing: !workout,
    workout,
  };
}

export function buildExerciseCountLabel(exerciseCount: number, alternativeCount: number): string {
  return `${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}${alternativeCount > 0 ? ` · +${alternativeCount} alt` : ''}`;
}

export function getCopyTargets({
  day,
  restDays,
  selected,
  takenDays,
}: {
  day: TrainingWeekday;
  restDays: Set<TrainingWeekday>;
  selected: Set<TrainingWeekday>;
  takenDays: Set<TrainingWeekday>;
}): TrainingWeekday[] {
  return [...selected].filter((target) => target !== day && !takenDays.has(target) && !restDays.has(target));
}

export function toggleWeekdaySelection(selected: Set<TrainingWeekday>, day: TrainingWeekday): Set<TrainingWeekday> {
  const next = new Set(selected);
  if (next.has(day)) {
    next.delete(day);
  } else {
    next.add(day);
  }
  return next;
}

export function buildConflictDaysLabel(
  conflictDays: Set<TrainingWeekday>,
  shortLabels: Record<string, string>,
): string {
  return [...conflictDays].map((day) => shortLabels[day]).join(', ');
}

export function findWorkoutById(workouts: Workout[], workoutId: string): null | Workout {
  return workouts.find((workout) => workout.id === workoutId) ?? null;
}

export function getWorkoutCountSummary(plan: TrainingPlan): {exerciseCount: number; workoutCount: number} {
  return {
    exerciseCount: plan.workouts.reduce((sum, workout) => sum + workout.workout_elements.length, 0),
    workoutCount: plan.workouts.length,
  };
}
