import type {Food} from '@/api/nutrition-foods';
import type {IngredientItem} from '@/foods/components/ingredient-list';

type IngredientLike = {
  food: Pick<
    Food,
    'calories_per_100g' | 'protein_g_per_100g' | 'carbs_g_per_100g' | 'fat_g_per_100g' | 'fiber_g_per_100g'
  >;
  weight_g: null | number | string;
};

function toPositiveNumber(value: null | number | string): null | number {
  if (value === '' || value == null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function roundToSingleDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function createIngredientDraft(food: Food): IngredientItem {
  return {
    amount: '',
    food,
    food_id: food.id,
    unit: '',
    weight_g: '',
  };
}

export function canComputeRecipeNutrition(ingredients: IngredientLike[]): boolean {
  return ingredients.some((ingredient) => toPositiveNumber(ingredient.weight_g) != null);
}

export type RecipeTotals = {
  calories: number;
  carbs_g: number;
  fats_g: number;
  fiber_g: number;
  protein_g: number;
};

/**
 * Macros contributed by `weightG` grams of a food, scaled from its per-100g
 * values. Unrounded — every consumer rounds at its own display edge (the
 * ingredient preview to integers, the totals card to one decimal).
 */
export function scaleFoodMacros(food: IngredientLike['food'], weightG: number): RecipeTotals {
  const factor = weightG / 100;
  return {
    calories: (food.calories_per_100g ?? 0) * factor,
    carbs_g: (food.carbs_g_per_100g ?? 0) * factor,
    fats_g: (food.fat_g_per_100g ?? 0) * factor,
    fiber_g: (food.fiber_g_per_100g ?? 0) * factor,
    protein_g: (food.protein_g_per_100g ?? 0) * factor,
  };
}

/**
 * How many servings `recipe.nutrition` covers. No (or zero) servings_count
 * means the recipe IS one serving — this is a division denominator, so the
 * zero case must map to 1, never 0.
 */
export function recipeServings(recipe: {servings_count?: null | number}): number {
  const count = recipe.servings_count ?? 0;
  return count > 0 ? count : 1;
}

// Raw recipe totals (sum across ingredients) for the form's live "recipe totals"
// nutrition card. Cooked weight does not affect totals.
export function computeRecipeTotalsFromIngredients(ingredients: IngredientLike[]): null | RecipeTotals {
  const totals: RecipeTotals = {calories: 0, carbs_g: 0, fats_g: 0, fiber_g: 0, protein_g: 0};
  let totalWeight = 0;

  for (const ingredient of ingredients) {
    const weightG = toPositiveNumber(ingredient.weight_g);
    if (!weightG) {
      continue;
    }
    totalWeight += weightG;
    const scaled = scaleFoodMacros(ingredient.food, weightG);
    totals.calories += scaled.calories;
    totals.protein_g += scaled.protein_g;
    totals.carbs_g += scaled.carbs_g;
    totals.fats_g += scaled.fats_g;
    totals.fiber_g += scaled.fiber_g;
  }

  if (totalWeight === 0) {
    return null;
  }

  return {
    calories: roundToSingleDecimal(totals.calories),
    carbs_g: roundToSingleDecimal(totals.carbs_g),
    fats_g: roundToSingleDecimal(totals.fats_g),
    fiber_g: roundToSingleDecimal(totals.fiber_g),
    protein_g: roundToSingleDecimal(totals.protein_g),
  };
}
