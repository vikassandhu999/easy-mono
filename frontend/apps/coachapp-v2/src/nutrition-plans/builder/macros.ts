/**
 * Macro arithmetic and formatting for the builder's figures. No React, no cache.
 */
import type {NutritionMeal} from '@/api/nutrition-plan-builder';

import {type NutritionPlanDay, slotRows} from './plan-tree';

/**
 * Round to one decimal place and strip trailing ".0"; `—` for missing.
 * The builder's macro strings all use this step ("12.4P", "80 kcal");
 * meal-item-row's whole-number contribution column is a deliberate variant.
 */
export function fmt(n: number | null | undefined): string {
  if (n == null) {
    return '—';
  }
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** "474 kcal", or null when the meal has no priced items. */
export function kcalLabel(nutrients: NutritionMeal['nutrients']): string | null {
  const kcal = nutrients?.calories;
  return kcal == null ? null : `${Math.round(kcal)} kcal`;
}

export function computeMealListTotals(meals: NutritionMeal[]) {
  const totals = {calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0};
  for (const meal of meals) {
    totals.calories += meal.nutrients.calories ?? 0;
    totals.protein_g += meal.nutrients.protein ?? 0;
    totals.carbs_g += meal.nutrients.carbohydrates ?? 0;
    totals.fat_g += meal.nutrients.fat ?? 0;
  }
  return totals;
}

/** Macro totals of the day's default options — the numbers behind the energy line. */
export function computeDayTotals(day: NutritionPlanDay, mealById: Map<string, NutritionMeal>) {
  return computeMealListTotals(
    slotRows(day)
      .map((row) => mealById.get(row.primary.nutrition_meal_id))
      .filter((meal): meal is NutritionMeal => meal != null),
  );
}
