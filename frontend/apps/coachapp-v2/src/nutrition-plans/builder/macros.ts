/**
 * Macro arithmetic and formatting for the builder's figures. No React, no cache.
 */
import type {NutritionMeal, NutritionPlanDay} from '@/api/nutrition-plan-builder';

import {slotRows} from './plan-tree';

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
export function kcalLabel(nutrition: NutritionMeal['nutrition']): string | null {
  const kcal = nutrition?.calories;
  return kcal == null ? null : `${Math.round(kcal)} kcal`;
}

/** Macro totals of the day's default options — the numbers behind the energy line. */
export function computeDayTotals(day: NutritionPlanDay, mealById: Map<string, NutritionMeal>) {
  const totals = {calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0};
  for (const row of slotRows(day)) {
    const nutrition = mealById.get(row.primary.nutrition_meal_id)?.nutrition;
    totals.calories += nutrition?.calories ?? 0;
    totals.protein_g += nutrition?.protein_g ?? 0;
    totals.carbs_g += nutrition?.carbs_g ?? 0;
    totals.fat_g += nutrition?.fat_g ?? 0;
  }
  return totals;
}
