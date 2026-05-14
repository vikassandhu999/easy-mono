import type {ApiResponse} from '@/api/shared';
import type {TrainingPlan, TrainingPlanItem, Workout, WorkoutElement} from '@/api/trainingPlans';

type TrainingPlanCacheDraft = ApiResponse<TrainingPlan>;

export function replaceTrainingPlanInCache(draft: TrainingPlanCacheDraft, plan: TrainingPlan) {
  draft.data = plan;
}

export function upsertWorkoutInPlan(draft: TrainingPlanCacheDraft, workout: Workout) {
  const index = draft.data.workouts.findIndex((item) => item.id === workout.id);
  if (index === -1) {
    draft.data.workouts.push(workout);
    return;
  }

  draft.data.workouts[index] = workout;
}

export function removeWorkoutFromPlan(draft: TrainingPlanCacheDraft, workoutId: string) {
  const workoutIndex = draft.data.workouts.findIndex((workout) => workout.id === workoutId);
  if (workoutIndex !== -1) {
    draft.data.workouts.splice(workoutIndex, 1);
  }

  draft.data.plan_items = draft.data.plan_items.filter((item) => item.workout_id !== workoutId);
}

export function upsertTrainingPlanItemInPlan(draft: TrainingPlanCacheDraft, item: TrainingPlanItem) {
  const index = draft.data.plan_items.findIndex((existing) => existing.id === item.id);
  if (index === -1) {
    draft.data.plan_items.push(item);
    return;
  }

  draft.data.plan_items[index] = item;
}

export function removeTrainingPlanItemFromPlan(draft: TrainingPlanCacheDraft, itemId: string) {
  const index = draft.data.plan_items.findIndex((item) => item.id === itemId);
  if (index !== -1) {
    draft.data.plan_items.splice(index, 1);
  }
}

export function upsertWorkoutElementInPlan(draft: TrainingPlanCacheDraft, element: WorkoutElement) {
  const workout = draft.data.workouts.find((item) => item.id === element.workout_id);
  if (!workout) return;

  const index = workout.workout_elements.findIndex((item) => item.id === element.id);
  if (index === -1) {
    workout.workout_elements.push(element);
    return;
  }

  const existing = workout.workout_elements[index]!;
  workout.workout_elements[index] = {
    ...element,
    exercise: element.exercise ?? existing.exercise,
  };
}

export function removeWorkoutElementFromPlan(
  draft: TrainingPlanCacheDraft,
  {elementId, workoutId}: {elementId: string; workoutId?: string},
) {
  const workouts = workoutId ? draft.data.workouts.filter((workout) => workout.id === workoutId) : draft.data.workouts;

  for (const workout of workouts) {
    const index = workout.workout_elements.findIndex((element) => element.id === elementId);
    if (index !== -1) {
      workout.workout_elements.splice(index, 1);
      return;
    }
  }
}
