import type {Food, NutrientTotals} from '@/api/nutrition-foods';

/**
 * One row of a recipe's ingredient editor. `amount`/`weight_g` are `string`
 * while the coach is mid-typing. Owned here (not by the component) so the
 * domain layer never imports from a component file.
 */
export type IngredientItem = {
  food: Food;
  food_id: string;
  amount: number | string;
  unit: string;
  weight_g: number | string;
};

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

function roundToSingleDecimal(value: number | null): number | null {
  return value == null ? null : Math.round(value * 10) / 10;
}

function scaleField(value: number | null | undefined, factor: number): number | null {
  return value == null ? null : value * factor;
}

function addField(left: number | null, right: number | null): number | null {
  return left == null || right == null ? null : left + right;
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
  return ingredients.length > 0 && ingredients.every((ingredient) => toPositiveNumber(ingredient.weight_g) != null);
}

export type RecipeTotals = NutrientTotals;

/**
 * Macros contributed by `weightG` grams of a food, scaled from its per-100g
 * values. Unknown fields stay unknown. Unrounded — every consumer rounds at
 * its own display edge.
 */
export function scaleFoodMacros(food: IngredientLike['food'], weightG: number): RecipeTotals {
  const factor = weightG / 100;
  const calories = scaleField(food.calories_per_100g, factor);
  const protein = scaleField(food.protein_g_per_100g, factor);
  const carbohydrates = scaleField(food.carbs_g_per_100g, factor);
  const fat = scaleField(food.fat_g_per_100g, factor);
  const fiber = scaleField(food.fiber_g_per_100g, factor);
  return {
    calories,
    carbohydrates,
    complete: calories != null && protein != null && carbohydrates != null && fat != null && fiber != null,
    fat,
    fiber,
    protein,
  };
}

export function recipeServings(recipe: {servings_count: number}): number {
  return recipe.servings_count > 0 ? recipe.servings_count : 1;
}

export function computeRecipeTotalsFromIngredients(ingredients: IngredientLike[]): null | RecipeTotals {
  const weighed = ingredients.filter((ingredient) => toPositiveNumber(ingredient.weight_g) != null);
  if (weighed.length === 0) {
    return null;
  }

  const totals = weighed.slice(1).reduce<RecipeTotals>(
    (acc, ingredient) => {
      const scaled = scaleFoodMacros(ingredient.food, toPositiveNumber(ingredient.weight_g)!);
      return {
        calories: addField(acc.calories, scaled.calories),
        carbohydrates: addField(acc.carbohydrates, scaled.carbohydrates),
        complete: false,
        fat: addField(acc.fat, scaled.fat),
        fiber: addField(acc.fiber, scaled.fiber),
        protein: addField(acc.protein, scaled.protein),
      };
    },
    scaleFoodMacros(weighed[0]!.food, toPositiveNumber(weighed[0]!.weight_g)!),
  );

  const rounded = {
    calories: roundToSingleDecimal(totals.calories),
    carbohydrates: roundToSingleDecimal(totals.carbohydrates),
    fat: roundToSingleDecimal(totals.fat),
    fiber: roundToSingleDecimal(totals.fiber),
    protein: roundToSingleDecimal(totals.protein),
  };

  return {
    ...rounded,
    complete:
      rounded.calories != null &&
      rounded.protein != null &&
      rounded.carbohydrates != null &&
      rounded.fat != null &&
      rounded.fiber != null,
  };
}
