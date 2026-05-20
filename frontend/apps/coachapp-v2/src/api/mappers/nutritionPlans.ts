import {mealFromApi} from '@/api/mappers/meals';
import {omitUndefined, toOptionalText} from '@/api/mappers/shared';
import type {NutritionPlan, NutritionPlanCreateRequest, NutritionPlanUpdateRequest} from '@/api/nutritionPlans';
import type {Macros} from '@/api/shared';
import type {NutritionPlanFormValues} from '@/nutrition-plans/nutrition-plan-form/nutrition-plan-form';

const NUTRITION_PLAN_MACRO_KEYS = ['calories', 'protein_g', 'carbs_g', 'fats_g'] as const;

function toOptionalMacrosGoal(values: NutritionPlanFormValues): Macros | undefined {
  const macros = NUTRITION_PLAN_MACRO_KEYS.reduce<Macros>((result, key) => {
    const value = values[key];
    if (value !== undefined) {
      result[key] = value;
    }
    return result;
  }, {});

  return Object.keys(macros).length > 0 ? macros : undefined;
}

export function nutritionPlanFromApi(plan: NutritionPlan): NutritionPlan {
  return {
    ...plan,
    meals: plan.meals?.map(mealFromApi),
  };
}

export function nutritionPlanToFormValues(plan: NutritionPlan): NutritionPlanFormValues {
  return {
    calories: plan.macros_goal?.calories,
    carbs_g: plan.macros_goal?.carbs_g,
    description: plan.description ?? '',
    fats_g: plan.macros_goal?.fats_g,
    name: plan.name,
    protein_g: plan.macros_goal?.protein_g,
  };
}

export function nutritionPlanToCreateRequest(values: NutritionPlanFormValues): NutritionPlanCreateRequest {
  return omitUndefined({
    name: values.name,
    description: toOptionalText(values.description),
    macros_goal: toOptionalMacrosGoal(values),
  });
}

export function nutritionPlanToUpdateRequest(values: NutritionPlanFormValues): NutritionPlanUpdateRequest {
  return omitUndefined({
    name: values.name,
    description: toOptionalText(values.description),
    macros_goal: toOptionalMacrosGoal(values),
  });
}
