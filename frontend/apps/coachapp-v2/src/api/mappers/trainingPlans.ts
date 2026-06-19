import {omitUndefined, toNullableText, toOptionalText} from '@/api/mappers/shared';
import type {
  PlannedSet,
  TrainingPlan,
  TrainingPlanCreateRequest,
  TrainingPlanUpdateRequest,
  WorkoutCreateRequest,
  WorkoutElementCreateRequest,
  WorkoutElementUpdateRequest,
  WorkoutUpdateRequest,
} from '@/api/trainingPlans';
import type {TrainingPlanFormValues} from '@/training-plans/training-plan-form/training-plan-form';

function toNullableDate(value: string): null | string {
  return value || null;
}

export function trainingPlanToFormValues(plan: TrainingPlan): TrainingPlanFormValues {
  return {
    description: plan.description ?? '',
    end_date: plan.end_date ?? '',
    name: plan.name,
    start_date: plan.start_date ?? '',
  };
}

export function trainingPlanToCreateRequest(values: TrainingPlanFormValues): TrainingPlanCreateRequest {
  return omitUndefined({
    name: values.name,
    description: toOptionalText(values.description),
    start_date: values.start_date || undefined,
    end_date: values.end_date || undefined,
  });
}

export function trainingPlanToUpdateRequest(values: TrainingPlanFormValues): TrainingPlanUpdateRequest {
  return {
    name: values.name,
    description: toNullableText(values.description),
    start_date: toNullableDate(values.start_date),
    end_date: toNullableDate(values.end_date),
  };
}

export function workoutToCreateRequest(name: string, notes?: string): WorkoutCreateRequest {
  return omitUndefined({
    name: name.trim(),
    notes: toOptionalText(notes),
  });
}

export function workoutNameToUpdateRequest(name: string): WorkoutUpdateRequest {
  return {name: name.trim()};
}

export function workoutNotesToUpdateRequest(notes: string): WorkoutUpdateRequest {
  return {notes: toNullableText(notes)};
}

export function workoutElementToCreateRequest({
  exerciseId,
  notes,
  plannedSets,
  position,
  workoutId,
}: {
  exerciseId: string;
  notes: string;
  plannedSets: PlannedSet[];
  position: number;
  workoutId: string;
}): WorkoutElementCreateRequest {
  return omitUndefined({
    exercise_id: exerciseId,
    notes: toOptionalText(notes),
    planned_sets: plannedSets,
    position,
    workout_id: workoutId,
  });
}

export function workoutElementToUpdateRequest({
  notes,
  plannedSets,
}: {
  notes: string;
  plannedSets: PlannedSet[];
}): WorkoutElementUpdateRequest {
  return {
    notes: toNullableText(notes),
    planned_sets: plannedSets,
  };
}
