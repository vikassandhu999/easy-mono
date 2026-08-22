import type {components} from './schema.ts';

export type TrainingPrescriptionReplaceRequest = components['schemas']['TrainingPrescriptionReplaceRequest'];

type TrainingPlan = components['schemas']['TrainingPlan'];
type TrainingWeekday = components['schemas']['TrainingPrescriptionScheduleEntry']['weekday'];

const LOCAL_ID_PREFIX = 'local:';

export function createLocalNodeId(kind: 'exercise' | 'workout'): string {
  return `${LOCAL_ID_PREFIX}${kind}-${crypto.randomUUID()}`;
}

export function isLocalNodeId(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX);
}

export function planToPrescriptionRequestForWeekdays(
  plan: TrainingPlan,
  weekdays: readonly TrainingWeekday[],
): TrainingPrescriptionReplaceRequest {
  return {
    expected_revision: plan.revision,
    workouts: plan.workouts.map((workout) => ({
      ...identity(workout.id),
      name: workout.name,
      position: workout.position,
      prescribed_exercises: workout.workout_elements.map((element) => ({
        ...identity(element.id),
        exercise_id: element.exercise_id,
        position: element.position,
        prescribed_sets: element.planned_sets,
      })),
    })),
    schedule: weekdays.map((weekday) => {
      const workoutId = plan.schedule[weekday];
      return workoutId ? {weekday, ...scheduleIdentity(workoutId)} : {weekday};
    }),
  };
}

function identity(id: string): {id: string} | {local_ref: string} {
  return isLocalNodeId(id) ? {local_ref: id.slice(LOCAL_ID_PREFIX.length)} : {id};
}

function scheduleIdentity(id: string): {workout_id: string} | {workout_ref: string} {
  return isLocalNodeId(id) ? {workout_ref: id.slice(LOCAL_ID_PREFIX.length)} : {workout_id: id};
}
