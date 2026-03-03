import {z} from 'zod';

import type {NutritionPlan} from '@/entities/nutritionPlans/api/nutritionPlans';
import type {NutritionPlanFormValues} from '@/features/library/nutrition-plans/nutritionPlanFormTypes';

import {validateMacroField} from '@/features/library/libraryFormSchemaShared';
import {parseOptionalNumber, toStringValue} from '@/features/library/libraryShared';

const MACRO_MAX = 10000;

export const NUTRITION_PLAN_FORM_SCHEMA = z
  .object({
    calories: z.string(),
    carbs: z.string(),
    description: z.string(),
    fat: z.string(),
    name: z.string().trim().min(1, 'Plan name is required.'),
    protein: z.string(),
    status: z.enum(['draft', 'active', 'archived']),
    tags: z.array(z.string()),
    type: z.enum(['template', 'personal']),
  })
  .superRefine((values, ctx) => {
    validateMacroField(ctx, values, 'calories', 'Calories', MACRO_MAX);
    validateMacroField(ctx, values, 'protein', 'Protein', MACRO_MAX);
    validateMacroField(ctx, values, 'carbs', 'Carbs', MACRO_MAX);
    validateMacroField(ctx, values, 'fat', 'Fat', MACRO_MAX);
  });

export const NUTRITION_PLAN_INITIAL_VALUES: NutritionPlanFormValues = {
  calories: '',
  carbs: '',
  description: '',
  fat: '',
  name: '',
  protein: '',
  status: 'draft',
  tags: [],
  type: 'template',
};

export const mapNutritionPlanToFormValues = (nutritionPlan: NutritionPlan): NutritionPlanFormValues => ({
  calories: toStringValue(nutritionPlan.macros_goal?.calories ?? nutritionPlan.macros_goal?.kcal),
  carbs: toStringValue(nutritionPlan.macros_goal?.carbs ?? nutritionPlan.macros_goal?.carbs_g),
  description: nutritionPlan.description ?? '',
  fat: toStringValue(nutritionPlan.macros_goal?.fat ?? nutritionPlan.macros_goal?.fat_g),
  name: nutritionPlan.name,
  protein: toStringValue(nutritionPlan.macros_goal?.protein ?? nutritionPlan.macros_goal?.protein_g),
  status: nutritionPlan.status === 'active' || nutritionPlan.status === 'archived' ? nutritionPlan.status : 'draft',
  tags: nutritionPlan.tags,
  type: nutritionPlan.type === 'personal' ? 'personal' : 'template',
});

export const parseOptionalPlanNumber = (value: string): number | undefined => {
  return parseOptionalNumber(value);
};

type NutritionPlanPayload = {
  description?: string;
  macros_goal?: {
    calories: number;
    carbs: number;
    fat: number;
    protein: number;
  };
  name: string;
  status: string;
  tags?: string[];
  type?: string;
};

export const buildNutritionPlanPayload = (
  values: NutritionPlanFormValues,
  isEditing: boolean,
): NutritionPlanPayload => {
  const calories = parseOptionalPlanNumber(values.calories);
  const protein = parseOptionalPlanNumber(values.protein);
  const carbs = parseOptionalPlanNumber(values.carbs);
  const fat = parseOptionalPlanNumber(values.fat);

  const macrosGoal =
    calories !== undefined || protein !== undefined || carbs !== undefined || fat !== undefined
      ? {
          calories: calories ?? 0,
          carbs: carbs ?? 0,
          fat: fat ?? 0,
          protein: protein ?? 0,
        }
      : undefined;

  return {
    description: values.description.trim() || undefined,
    macros_goal: macrosGoal,
    name: values.name.trim(),
    status: values.status,
    tags: values.tags.length > 0 ? values.tags : undefined,
    ...(isEditing ? {} : {type: values.type}),
  };
};
