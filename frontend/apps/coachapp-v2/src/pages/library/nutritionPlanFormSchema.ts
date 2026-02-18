import { z } from "zod";

import type { NutritionPlan } from "@/api/nutritionPlans";
import type { NutritionPlanFormValues } from "@/pages/library/nutritionPlanFormTypes";

import {
  parseOptionalNumber,
  toStringValue,
} from "@/pages/library/libraryShared";
import { validateMacroField } from "@/pages/library/libraryFormSchemaShared";

const MACRO_MAX = 10000;

export const NUTRITION_PLAN_FORM_SCHEMA = z
  .object({
    calories: z.string(),
    carbs: z.string(),
    description: z.string(),
    fat: z.string(),
    name: z.string().trim().min(1, "Plan name is required."),
    protein: z.string(),
    status: z.enum(["draft", "active", "archived"]),
    tags: z.array(z.string()),
    type: z.enum(["template", "personal"]),
  })
  .superRefine((values, ctx) => {
    validateMacroField(ctx, values, "calories", "Calories", MACRO_MAX);
    validateMacroField(ctx, values, "protein", "Protein", MACRO_MAX);
    validateMacroField(ctx, values, "carbs", "Carbs", MACRO_MAX);
    validateMacroField(ctx, values, "fat", "Fat", MACRO_MAX);
  });

export const NUTRITION_PLAN_INITIAL_VALUES: NutritionPlanFormValues = {
  calories: "",
  carbs: "",
  description: "",
  fat: "",
  name: "",
  protein: "",
  status: "draft",
  tags: [],
  type: "template",
};

export const mapNutritionPlanToFormValues = (
  nutritionPlan: NutritionPlan,
): NutritionPlanFormValues => ({
  calories: toStringValue(
    nutritionPlan.macros_goal?.calories ?? nutritionPlan.macros_goal?.kcal,
  ),
  carbs: toStringValue(
    nutritionPlan.macros_goal?.carbs ?? nutritionPlan.macros_goal?.carbs_g,
  ),
  description: nutritionPlan.description ?? "",
  fat: toStringValue(
    nutritionPlan.macros_goal?.fat ?? nutritionPlan.macros_goal?.fat_g,
  ),
  name: nutritionPlan.name,
  protein: toStringValue(
    nutritionPlan.macros_goal?.protein ?? nutritionPlan.macros_goal?.protein_g,
  ),
  status:
    nutritionPlan.status === "active" || nutritionPlan.status === "archived"
      ? nutritionPlan.status
      : "draft",
  tags: nutritionPlan.tags,
  type: nutritionPlan.type === "personal" ? "personal" : "template",
});

export const parseOptionalPlanNumber = (value: string): number | undefined => {
  return parseOptionalNumber(value);
};
