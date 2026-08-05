import type {NutritionMealItemRequest} from '../../api/nutrition-plan-builder.ts';

type Serving = {unit: string};

export function buildMealItemDraft({
  activeServing,
  foodId,
  recipeId,
  resolvedWeightG,
  servingCount,
}: {
  activeServing: Serving | null;
  foodId?: string;
  recipeId?: string;
  resolvedWeightG: number | null;
  servingCount: string;
}): NutritionMealItemRequest {
  const count = Number.parseFloat(servingCount);
  const amount = Number.isNaN(count) ? 1 : count;

  return {
    ...(foodId && {food_id: foodId}),
    ...(recipeId && {recipe_id: recipeId, amount, unit: 'serving'}),
    ...(resolvedWeightG != null && {weight_g: resolvedWeightG}),
    ...(activeServing && {amount, unit: activeServing.unit}),
  };
}
