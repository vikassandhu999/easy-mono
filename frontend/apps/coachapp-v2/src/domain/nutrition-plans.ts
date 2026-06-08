import type {Meal} from '@/api/meals';

export type MealMacroSummary = {
  calories: number;
  protein_g: number;
};

export function getMealMacroSummary(meal: Meal): MealMacroSummary {
  if (meal.macros && (meal.macros.calories || meal.macros.protein_g)) {
    return {
      calories: meal.macros.calories ?? 0,
      protein_g: meal.macros.protein_g ?? 0,
    };
  }

  let calories = 0;
  let proteinG = 0;

  for (const item of meal.meal_items) {
    const itemMacros = item.food?.macros ?? item.recipe?.macros;
    if (!itemMacros) {
      continue;
    }

    const multiplier = item.weight_g != null ? item.weight_g / 100 : (item.amount ?? 1);
    calories += (itemMacros.calories ?? 0) * multiplier;
    proteinG += (itemMacros.protein_g ?? 0) * multiplier;
  }

  return {
    calories,
    protein_g: proteinG,
  };
}
