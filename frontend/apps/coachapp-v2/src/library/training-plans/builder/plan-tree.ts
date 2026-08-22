/**
 * Finding things in a plan. Used against both the live plan and an immer draft
 * of it, which is why these take the plan rather than closing over one.
 */
import type {TrainingPlan, TrainingPlanWorkout} from '@/api/training-plans';

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
