import {TRAINING_WEEKDAYS} from '@easy/utils';
import type {
  paths,
  TrainingPlanReplacePrescription,
  TrainingPlanScheduleInput,
  TrainingPlan as TrainingPlanSchema,
} from './schema.ts';
import {omitUndefined} from './shared.ts';

// --- training-session-history ---

type ListCoachClientTrainingSessionsQuery = NonNullable<
  paths['/v1/coach/clients/{client_id}/training-sessions']['get']['parameters']['query']
>;

export function coachClientTrainingSessionHistoryRequest(
  clientId: string,
  query?: ListCoachClientTrainingSessionsQuery,
) {
  return query
    ? {params: {path: {client_id: clientId}, query: omitUndefined(query)}}
    : {params: {path: {client_id: clientId}}};
}

// --- training-prescription ---

type TrainingPlan = TrainingPlanSchema;

export function planToPrescriptionRequest(plan: TrainingPlan): TrainingPrescriptionReplaceRequest {
  return planToPrescriptionRequestForWeekdays(plan, TRAINING_WEEKDAYS);
}

// --- training-prescription-mapper ---

export type TrainingPrescriptionReplaceRequest = TrainingPlanReplacePrescription;

type TrainingWeekday = TrainingPlanScheduleInput['weekday'];

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
        prescribed_sets: element.planned_sets.map(({rpe, ...set}) => ({
          ...set,
          rpe: decimalNumber(rpe),
        })),
      })),
    })),
    schedule: weekdays.map((weekday) => {
      const workoutId = plan.schedule[weekday];
      return workoutId ? {weekday, ...scheduleIdentity(workoutId)} : {weekday};
    }),
  };
}

function decimalNumber(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid decimal value: ${value}`);
  }
  return number;
}

function identity(id: string): {id: string} | {local_ref: string} {
  return isLocalNodeId(id) ? {local_ref: id.slice(LOCAL_ID_PREFIX.length)} : {id};
}

function scheduleIdentity(id: string): {workout_id: string} | {workout_ref: string} {
  return isLocalNodeId(id) ? {workout_ref: id.slice(LOCAL_ID_PREFIX.length)} : {workout_id: id};
}
