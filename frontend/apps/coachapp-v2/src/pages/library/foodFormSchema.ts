import { z } from "zod";

import type { Food } from "@/api/foods";
import type { FoodFormValues } from "@/pages/library/foodFormTypes";

const CALORIES_MAX = 5000;
const MACRO_GRAMS_MAX = 1000;

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10;

const URL_MESSAGE = "Image URL must be a valid URL.";

const createEmptyServingSize = () => ({
  amount: "",
  unit: "",
  weight_g: "",
});

const toStringValue = (value: null | number | string | undefined) =>
  value === null || value === undefined ? "" : String(value);

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
    const validateMacroField = (
      field: "calories" | "carbs" | "fat" | "protein",
      label: string,
      max: number,
    ) => {
      const raw = values[field];
      if (!raw.trim()) {
        return;
      }

      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} must be a valid number.`,
          path: [field],
        });
        return;
      }
      if (parsed < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} must be 0 or more.`,
          path: [field],
        });
        return;
      }
      if (parsed > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} seems too high (max ${max}).`,
          path: [field],
        });
      }
    };

    validateMacroField("calories", "Calories", CALORIES_MAX);
    validateMacroField("protein", "Protein", MACRO_GRAMS_MAX);
    validateMacroField("carbs", "Carbs", MACRO_GRAMS_MAX);
    validateMacroField("fat", "Fat", MACRO_GRAMS_MAX);

    if (values.image_url.trim()) {
      const result = z
        .string()
        .url(URL_MESSAGE)
        .safeParse(values.image_url.trim());
      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: URL_MESSAGE,
          path: ["image_url"],
        });
      }
    }

    values.serving_sizes.forEach((servingSize, index) => {
      const hasUnit = Boolean(servingSize.unit.trim());
      const hasWeight = Boolean(servingSize.weight_g.trim());
      const hasAmount = Boolean(servingSize.amount.trim());

      if (!hasUnit && !hasWeight && !hasAmount) {
        return;
      }

      if (!hasUnit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Serving size ${index + 1}: unit is required.`,
          path: ["serving_sizes", index, "unit"],
        });
      }

      if (hasWeight) {
        const weight = Number(servingSize.weight_g);
        if (!Number.isFinite(weight) || weight < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Serving size ${index + 1}: weight must be 0 or more.`,
            path: ["serving_sizes", index, "weight_g"],
          });
        }
      }

      if (hasAmount) {
        const amount = Number(servingSize.amount);
        if (!Number.isFinite(amount) || amount < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Serving size ${index + 1}: amount must be 0 or more.`,
            path: ["serving_sizes", index, "amount"],
          });
        }
      }
    });
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
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? roundToOneDecimal(parsed) : undefined;
};
