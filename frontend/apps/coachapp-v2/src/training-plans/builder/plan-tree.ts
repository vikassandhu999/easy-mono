/**
 * Finding things in a plan. Used against both the live plan and an immer draft
 * of it, which is why these take the plan rather than closing over one.
 */
import type {TrainingPlan, TrainingPlanWorkout} from '@/api/generated';

export function findWorkout(plan: TrainingPlan, workoutId: string): TrainingPlanWorkout | undefined {
  return plan.workouts.find((workout) => workout.id === workoutId);
}

export function findElement(plan: TrainingPlan, elementId: string) {
  for (const workout of plan.workouts) {
    const element = workout.workout_elements.find((candidate) => candidate.id === elementId);
    if (element) {
      return {workout, element};
    }
  }
  return undefined;
}

/** Moves one id to another slot. An out-of-range move is a no-op. */
export function moveId(ids: string[], from: number, to: number): string[] {
  const moved = ids[from];
  if (moved === undefined || to < 0 || to >= ids.length) {
    return ids;
  }
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
