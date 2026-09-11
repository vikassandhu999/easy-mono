import type {TrainingPlan, TrainingPrescription} from '../api/training-plans';

type WorkoutInput = TrainingPrescription['workouts'][number];
type ExerciseInput = WorkoutInput['prescribed_exercises'][number];
type SetInput = ExerciseInput['prescribed_sets'][number];
export type DraftSet = Pick<SetInput, 'set_type' | 'load_unit' | 'distance_unit'> & {
  reps: string;
  load_value: string;
  duration_seconds: string;
  distance_value: string;
  rpe: string;
  rest_seconds: string;
  notes: string;
};
export type DraftExercise = Omit<ExerciseInput, 'prescribed_sets'> & {name: string; prescribed_sets: DraftSet[]};
export type DraftWorkout = Omit<WorkoutInput, 'prescribed_exercises'> & {prescribed_exercises: DraftExercise[]};
export const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type PrescriptionDraft = {
  name: string;
  description: string;
  workouts: DraftWorkout[];
  schedule: Record<(typeof weekdays)[number], string>;
};
export function newSet(): DraftSet {
  return {
    set_type: 'working',
    reps: '',
    load_value: '',
    load_unit: null,
    duration_seconds: '',
    distance_value: '',
    distance_unit: null,
    rpe: '',
    rest_seconds: '',
    notes: '',
  };
}
export function draftFromPlan(plan?: TrainingPlan): PrescriptionDraft {
  return {
    name: plan?.name ?? 'Untitled training plan',
    description: plan?.description ?? '',
    workouts: (plan?.workouts ?? []).map((workout) => ({
      id: workout.id,
      name: workout.name,
      position: workout.position,
      prescribed_exercises: workout.workout_elements.map((element) => ({
        id: element.id,
        exercise_id: element.exercise_id,
        name: element.exercise.name,
        position: element.position,
        prescribed_sets: element.planned_sets.map((set) => ({
          ...set,
          reps: set.reps ?? '',
          load_value: set.load_value ?? '',
          duration_seconds: set.duration_seconds?.toString() ?? '',
          distance_value: set.distance_value ?? '',
          rpe: set.rpe ?? '',
          rest_seconds: set.rest_seconds?.toString() ?? '',
          notes: set.notes ?? '',
        })),
      })),
    })),
    schedule: {
      monday: plan?.schedule.monday ?? '',
      tuesday: plan?.schedule.tuesday ?? '',
      wednesday: plan?.schedule.wednesday ?? '',
      thursday: plan?.schedule.thursday ?? '',
      friday: plan?.schedule.friday ?? '',
      saturday: plan?.schedule.saturday ?? '',
      sunday: plan?.schedule.sunday ?? '',
    },
  };
}
export function prescriptionBody(draft: PrescriptionDraft, revision: number): TrainingPrescription {
  return {
    expected_revision: revision,
    workouts: draft.workouts.map((workout, position) => ({
      ...(workout.id ? {id: workout.id} : workout.local_ref ? {local_ref: workout.local_ref} : {}),
      name: workout.name.trim(),
      position,
      prescribed_exercises: workout.prescribed_exercises.map((exercise, exercisePosition) => ({
        ...(exercise.id ? {id: exercise.id} : exercise.local_ref ? {local_ref: exercise.local_ref} : {}),
        exercise_id: exercise.exercise_id,
        position: exercisePosition,
        prescribed_sets: exercise.prescribed_sets.map((set) => ({
          set_type: set.set_type ?? null,
          reps: set.reps.trim() || null,
          load_value: set.load_value.trim() || null,
          load_unit: set.load_unit ?? null,
          duration_seconds: set.duration_seconds === '' ? null : Number(set.duration_seconds),
          distance_value: set.distance_value.trim() || null,
          distance_unit: set.distance_unit ?? null,
          rpe: set.rpe === '' ? null : Number(set.rpe),
          rest_seconds: set.rest_seconds === '' ? null : Number(set.rest_seconds),
          notes: set.notes.trim() || null,
        })),
      })),
    })),
    schedule: weekdays.map((weekday) => {
      const workout = draft.workouts.find((item) => (item.id ?? item.local_ref) === draft.schedule[weekday]);
      return {
        weekday,
        ...(workout?.id ? {workout_id: workout.id} : workout?.local_ref ? {workout_ref: workout.local_ref} : {}),
      };
    }),
  };
}

export function duplicateWorkout(workout: DraftWorkout): DraftWorkout {
  return {
    local_ref: crypto.randomUUID(),
    name: `${workout.name.slice(0, 248)} (copy)`,
    position: workout.position + 1,
    prescribed_exercises: workout.prescribed_exercises.map((exercise) => ({
      local_ref: crypto.randomUUID(),
      exercise_id: exercise.exercise_id,
      name: exercise.name,
      position: exercise.position,
      prescribed_sets: exercise.prescribed_sets.map((set) => ({...set})),
    })),
  };
}

export function samePrescription(set: DraftSet, source: DraftSet) {
  return (
    [
      'set_type',
      'reps',
      'load_value',
      'load_unit',
      'rest_seconds',
      'rpe',
      'duration_seconds',
      'distance_value',
      'distance_unit',
      'notes',
    ] as const
  ).every((key) => set[key] === source[key]);
}

export function setSummary(set: DraftSet) {
  return (
    [
      ...(set.reps ? [`${set.reps} reps`] : []),
      ...(set.load_unit === 'bodyweight'
        ? ['Bodyweight']
        : set.load_value
          ? [`${set.load_value} ${set.load_unit === 'none' ? '' : (set.load_unit ?? '')}`.trim()]
          : []),
      ...(set.rest_seconds ? [`${set.rest_seconds}s rest`] : []),
      ...(set.rpe ? [`RPE ${set.rpe}`] : []),
      ...(set.duration_seconds ? [`${set.duration_seconds}s duration`] : []),
      ...(set.distance_value
        ? [`${set.distance_value} ${set.distance_unit === 'none' ? '' : (set.distance_unit ?? '')}`.trim()]
        : []),
    ].join(' · ') || 'Targets not set'
  );
}
