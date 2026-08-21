import type {NutritionMealItemInput} from '../../api/nutrition-plan-builder.ts';

type Serving = {label: string; unit: string};

export type MealItemDraft = Pick<NutritionMealItemInput, 'kind' | 'food_id' | 'recipe_id' | 'portion'>;

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
}): Pick<NutritionMealItemInput, 'kind' | 'food_id' | 'recipe_id' | 'portion'> {
  const count = Number.parseFloat(servingCount);
  const amount = Number.isNaN(count) ? 1 : count;

  if (recipeId) {
    return {
      kind: 'recipe',
      recipe_id: recipeId,
      portion:
        resolvedWeightG != null ? {kind: 'gram', grams: resolvedWeightG} : {kind: 'serving', amount, unit: 'serving'},
    };
  }

  if (activeServing) {
    return {
      kind: 'food',
      food_id: foodId,
      portion: {kind: 'serving', amount, unit: activeServing.unit, label: activeServing.label},
    };
  }

  return {
    kind: 'food',
    food_id: foodId,
    portion: {kind: 'gram', grams: resolvedWeightG ?? undefined},
  };
}
