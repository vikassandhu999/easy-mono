import type {
  Equipment,
  Exercise,
  ExerciseCreateRequest,
  ExerciseUpdateRequest,
  Muscle,
} from '@/api/exercises';
import type {ExerciseFormValues} from '@/exercises/exercise-form/exercise-form';

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function toOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toOptionalArray<T>(value: T[] | undefined): T[] | undefined {
  return value && value.length > 0 ? value : undefined;
}

export function muscleFromApi(muscle: Muscle): Muscle {
  return muscle;
}

export function equipmentFromApi(equipment: Equipment): Equipment {
  return equipment;
}

export function exerciseFromApi(exercise: Exercise): Exercise {
  return {
    ...exercise,
    equipment: exercise.equipment.map(equipmentFromApi),
    muscles: exercise.muscles.map(muscleFromApi),
  };
}

export function exerciseToFormValues(exercise: Exercise): ExerciseFormValues {
  return {
    description: exercise.description ?? '',
    equipment_ids: exercise.equipment.map((item) => item.id),
    force: exercise.force ?? '',
    image_url: '',
    images: exercise.images,
    instructions: exercise.instructions ?? '',
    mechanics: exercise.mechanics ?? '',
    muscle_ids: exercise.muscles.map((item) => item.id),
    name: exercise.name,
  };
}

export function exerciseToCreateRequest(values: ExerciseFormValues): ExerciseCreateRequest {
  return omitUndefined({
    name: values.name,
    description: toOptionalText(values.description),
    instructions: toOptionalText(values.instructions),
    mechanics: values.mechanics || undefined,
    force: values.force || undefined,
    muscle_ids: toOptionalArray(values.muscle_ids),
    equipment_ids: toOptionalArray(values.equipment_ids),
    images: toOptionalArray(values.images),
  });
}

export function exerciseToUpdateRequest(values: ExerciseFormValues): ExerciseUpdateRequest {
  return {
    name: values.name,
    description: toOptionalText(values.description),
    instructions: toOptionalText(values.instructions),
    mechanics: values.mechanics || undefined,
    force: values.force || undefined,
    muscle_ids: values.muscle_ids ?? [],
    equipment_ids: values.equipment_ids ?? [],
    images: values.images ?? [],
  };
}
