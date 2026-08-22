import {z} from 'zod';
import type {
  NutritionPlan,
  NutritionPlanCreateRequest,
  NutritionPlanUpdateRequest,
} from '../../api/nutrition-plans-list.ts';
import {omitUndefined, toNullableText, toOptionalText} from '../../api/shared.ts';
import {numberFieldSchema} from '../../ui/number-field-value.ts';

const optionalNumber = numberFieldSchema(z.number().min(0, 'Use 0 or higher').optional());

export const nutritionPlanFormSchema = z.object({
  calories: optionalNumber,
  carbs_g: optionalNumber,
  description: z.string().optional(),
  fats_g: optionalNumber,
  fiber_g: optionalNumber,
  name: z.string().trim().min(1, 'Enter plan name').max(255, 'Use 255 characters or fewer'),
  protein_g: optionalNumber,
});

export type NutritionPlanFormValues = z.infer<typeof nutritionPlanFormSchema>;

export const NUTRITION_PLAN_FORM_DEFAULTS: NutritionPlanFormValues = {
  calories: undefined,
  carbs_g: undefined,
  description: '',
  fats_g: undefined,
  fiber_g: undefined,
  name: '',
  protein_g: undefined,
};

export function nutritionPlanToFormValues(plan: NutritionPlan): NutritionPlanFormValues {
  return {
    calories: plan.target_calories ?? undefined,
    carbs_g: plan.target_carbs_g ?? undefined,
    description: plan.description ?? '',
    fats_g: plan.target_fat_g ?? undefined,
    fiber_g: plan.target_fiber_g ?? undefined,
    name: plan.name,
    protein_g: plan.target_protein_g ?? undefined,
  };
}

export function nutritionPlanToCreateRequest(values: NutritionPlanFormValues): NutritionPlanCreateRequest {
  return omitUndefined({
    name: values.name,
    description: toOptionalText(values.description),
    target_calories: values.calories,
    target_protein_g: values.protein_g,
    target_carbs_g: values.carbs_g,
    target_fat_g: values.fats_g,
    target_fiber_g: values.fiber_g,
  });
}

export function nutritionPlanToUpdateRequest(
  values: NutritionPlanFormValues,
  expectedRevision: number,
): NutritionPlanUpdateRequest {
  return {
    expected_revision: expectedRevision,
    name: values.name,
    description: toNullableText(values.description),
    target_calories: values.calories ?? null,
    target_protein_g: values.protein_g ?? null,
    target_carbs_g: values.carbs_g ?? null,
    target_fat_g: values.fats_g ?? null,
    target_fiber_g: values.fiber_g ?? null,
  };
}
