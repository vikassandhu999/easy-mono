import type {Exercise, ExerciseCreate, ExerciseRelation, ExerciseUpdate} from '../api/exercises';

export function fields(exercise?: Exercise) {
  return {
    name: exercise?.name ?? '',
    instructions: exercise?.instructions ?? '',
    mechanics: exercise?.mechanics ?? null,
    force: exercise?.force ?? null,
    muscles: exercise?.muscles ?? [],
    equipment: exercise?.equipment ?? [],
    media: exercise?.media ?? null,
    measures: exercise?.measures ?? ['reps', 'load'],
    bodyweight: exercise?.bodyweight ?? false,
  };
}
export type ExerciseFields = ReturnType<typeof fields>;
export function body(values: ExerciseFields): ExerciseCreate {
  return {
    name: values.name.trim(),
    instructions: values.instructions.trim() || null,
    mechanics: values.mechanics,
    force: values.force,
    muscle_ids: values.muscles.map((item) => item.id),
    equipment_ids: values.equipment.map((item) => item.id),
    media_id: values.media?.id ?? null,
    measures: values.measures,
    bodyweight: values.bodyweight,
  };
}
// The API does not have revision preconditions. Limit updates to the coach's edited fields.
export function changes(values: ExerciseFields, saved: Exercise): ExerciseUpdate {
  const input = body(values);
  const sameIds = (left: ExerciseRelation[], right: ExerciseRelation[]) =>
    left.length === right.length && left.every((item) => right.some((other) => other.id === item.id));
  return {
    ...(input.name === saved.name ? {} : {name: input.name}),
    ...(input.instructions === saved.instructions ? {} : {instructions: input.instructions}),
    ...(input.mechanics === saved.mechanics ? {} : {mechanics: input.mechanics}),
    ...(input.force === saved.force ? {} : {force: input.force}),
    ...(sameIds(values.muscles, saved.muscles) ? {} : {muscle_ids: input.muscle_ids}),
    ...(sameIds(values.equipment, saved.equipment) ? {} : {equipment_ids: input.equipment_ids}),
    ...(input.media_id === (saved.media?.id ?? null) ? {} : {media_id: input.media_id}),
  };
}
