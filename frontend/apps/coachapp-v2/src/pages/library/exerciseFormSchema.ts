import { z } from "zod";

import type { Exercise } from "@/api/exercises";
import type { ExerciseFormValues } from "@/pages/library/exerciseFormTypes";

import { validateImageUrl } from "@/pages/library/libraryFormSchemaShared";

const createEmptyImageField = () => ({
  url: "",
});

export const EXERCISE_FORM_SCHEMA = z
  .object({
    description: z.string(),
    equipment_ids: z.array(z.string()),
    force: z.enum(["", "pull", "push", "static"]),
    images: z.array(
      z.object({
        url: z.string(),
      }),
    ),
    instructions: z.string(),
    mechanics: z.enum(["", "compound", "isolation", "isometric"]),
    muscle_ids: z.array(z.string()),
    name: z.string().trim().min(1, "Exercise name is required."),
  })
  .superRefine((values, ctx) => {
    values.images.forEach((image, index) => {
      validateImageUrl(ctx, image.url, ["images", index, "url"]);
    });
  });

export const EXERCISE_INITIAL_VALUES: ExerciseFormValues = {
  description: "",
  equipment_ids: [],
  force: "",
  images: [createEmptyImageField()],
  instructions: "",
  mechanics: "",
  muscle_ids: [],
  name: "",
};

export const mapExerciseToFormValues = (
  exercise: Exercise,
): ExerciseFormValues => ({
  description: exercise.description ?? "",
  equipment_ids: exercise.equipment.map((item) => item.id),
  force: exercise.force ?? "",
  images:
    exercise.images.length > 0
      ? exercise.images.map((url) => ({ url }))
      : [createEmptyImageField()],
  instructions: exercise.instructions ?? "",
  mechanics: exercise.mechanics ?? "",
  muscle_ids: exercise.muscles.map((muscle) => muscle.id),
  name: exercise.name,
});

export const buildExerciseImageUrls = (values: ExerciseFormValues) =>
  values.images.map((image) => image.url.trim()).filter(Boolean);

export const createEmptyExerciseImageField = createEmptyImageField;
