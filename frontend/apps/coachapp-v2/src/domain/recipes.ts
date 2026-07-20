import type {Food} from '@/api/generated';
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
    const factor = weightG / 100;
    const {food} = ingredient;
    totals.calories += (food.calories_per_100g ?? 0) * factor;
    totals.protein_g += (food.protein_g_per_100g ?? 0) * factor;
    totals.carbs_g += (food.carbs_g_per_100g ?? 0) * factor;
    totals.fats_g += (food.fat_g_per_100g ?? 0) * factor;
    totals.fiber_g += (food.fiber_g_per_100g ?? 0) * factor;
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
