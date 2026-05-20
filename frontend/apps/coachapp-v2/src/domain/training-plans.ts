import type {Workout, WorkoutElement} from '@/api/trainingPlans';

export function getNextWorkoutElementPosition(elements: WorkoutElement[]): number {
  return elements.length > 0 ? Math.max(...elements.map((element) => element.position)) + 1 : 0;
}

export function findWorkoutById(workouts: Workout[], workoutId: string): undefined | Workout {
  return workouts.find((workout) => workout.id === workoutId);
}
