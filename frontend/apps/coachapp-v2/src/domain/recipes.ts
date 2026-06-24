import type {Food} from '@/api/generated';
import type {IngredientItem} from '@/foods/components/ingredient-list';

const RECIPE_COMPUTED_MACRO_KEYS = [
  'calories_per_100g',
  'protein_g',
  'carbs_g',
  'fats_g',
  'fiber_g',
  'sugar_g',
] as const;

type RecipeComputedMacroKey = (typeof RECIPE_COMPUTED_MACRO_KEYS)[number];

type IngredientLike = {
  food: Pick<
    Food,
    'calories_per_100g' | 'protein_g_per_100g' | 'carbs_g_per_100g' | 'fat_g_per_100g' | 'fiber_g_per_100g'
  >;
  weight_g: null | number | string;
};

type RecipeNutritionResult = Partial<Record<RecipeComputedMacroKey, number>>;

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

export function computeRecipeNutritionFromIngredients({
  cookedWeight,
  ingredients,
}: {
  cookedWeight: number | undefined;
  ingredients: IngredientLike[];
}): null | RecipeNutritionResult {
  const totals: RecipeNutritionResult = {};
  let totalWeight = 0;

  for (const ingredient of ingredients) {
    const weightG = toPositiveNumber(ingredient.weight_g);
    if (!weightG) {
      continue;
    }

    totalWeight += weightG;
    const factor = weightG / 100;

    const {food} = ingredient;
    const macroValues: Partial<Record<RecipeComputedMacroKey, number | null | undefined>> = {
      calories_per_100g: food.calories_per_100g,
      protein_g: food.protein_g_per_100g,
      carbs_g: food.carbs_g_per_100g,
      fats_g: food.fat_g_per_100g,
      fiber_g: food.fiber_g_per_100g,
      sugar_g: undefined,
    };

    for (const key of RECIPE_COMPUTED_MACRO_KEYS) {
      const macro = macroValues[key];
      if (macro == null) {
        continue;
      }
      totals[key] = (totals[key] ?? 0) + macro * factor;
    }
  }

  if (totalWeight === 0) {
    return null;
  }

  const divisor = cookedWeight && cookedWeight > 0 ? cookedWeight : totalWeight;
  const result: RecipeNutritionResult = {
    calories_per_100g: roundToSingleDecimal((totals.calories_per_100g ?? 0) * (100 / divisor)),
    protein_g: roundToSingleDecimal((totals.protein_g ?? 0) * (100 / divisor)),
    carbs_g: roundToSingleDecimal((totals.carbs_g ?? 0) * (100 / divisor)),
    fats_g: roundToSingleDecimal((totals.fats_g ?? 0) * (100 / divisor)),
  };

  if (totals.fiber_g !== undefined) {
    result.fiber_g = roundToSingleDecimal(totals.fiber_g * (100 / divisor));
  }
  if (totals.sugar_g !== undefined) {
    result.sugar_g = roundToSingleDecimal(totals.sugar_g * (100 / divisor));
  }

  return result;
}
