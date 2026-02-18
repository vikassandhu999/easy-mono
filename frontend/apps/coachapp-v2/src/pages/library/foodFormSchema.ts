import { z } from "zod";

import type { Food } from "@/api/foods";
import type { FoodFormValues } from "@/pages/library/foodFormTypes";

import {
  parseOptionalNumber,
  toStringValue,
} from "@/pages/library/libraryShared";
import {
  CALORIES_MAX,
  createEmptyServingSize,
  MACRO_GRAMS_MAX,
  validateImageUrl,
  validateMacroField,
  validateServingSizes,
} from "@/pages/library/libraryFormSchemaShared";

export const FOOD_NUMERIC_STEP = "0.1";

export const FOOD_FORM_SCHEMA = z
  .object({
    calories: z.string(),
    carbs: z.string(),
    category: z.string(),
    fat: z.string(),
    image_url: z.string(),
    name: z.string().trim().min(1, "Food name is required."),
    notes: z.string(),
    protein: z.string(),
    serving_sizes: z.array(
      z.object({
        amount: z.string(),
        unit: z.string(),
        weight_g: z.string(),
      }),
    ),
    source: z.string(),
    tags: z.array(z.string()),
  })
  .superRefine((values, ctx) => {
    validateMacroField(ctx, values, "calories", "Calories", CALORIES_MAX);
    validateMacroField(ctx, values, "protein", "Protein", MACRO_GRAMS_MAX);
    validateMacroField(ctx, values, "carbs", "Carbs", MACRO_GRAMS_MAX);
    validateMacroField(ctx, values, "fat", "Fat", MACRO_GRAMS_MAX);

    validateImageUrl(ctx, values.image_url);
    validateServingSizes(ctx, values.serving_sizes);
  });

export const FOOD_INITIAL_VALUES: FoodFormValues = {
  calories: "",
  carbs: "",
  category: "",
  fat: "",
  image_url: "",
  name: "",
  notes: "",
  protein: "",
  serving_sizes: [createEmptyServingSize()],
  source: "",
  tags: [],
};

export const mapFoodToFormValues = (food: Food): FoodFormValues => ({
  calories: toStringValue(food.macros?.calories ?? food.macros?.kcal),
  carbs: toStringValue(food.macros?.carbs ?? food.macros?.carbs_g),
  category: food.category ?? "",
  fat: toStringValue(food.macros?.fat ?? food.macros?.fat_g),
  image_url: food.image_url ?? "",
  name: food.name,
  notes: food.notes ?? "",
  protein: toStringValue(food.macros?.protein ?? food.macros?.protein_g),
  serving_sizes:
    food.serving_sizes.length > 0
      ? food.serving_sizes.map((servingSize) => ({
          amount: toStringValue(servingSize.amount),
          unit: servingSize.unit,
          weight_g: toStringValue(servingSize.weight_g),
        }))
      : [createEmptyServingSize()],
  source: food.source ?? "",
  tags: food.tags,
});

export const parseOptionalMacroNumber = (value: string): number | undefined => {
  return parseOptionalNumber(value);
};
