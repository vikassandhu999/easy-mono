/**
 * Nutrition day view helpers. Slots, statuses, totals, and adherence come from
 * the Nutrition Day contract; this module only maps them for display.
 */
import type {NutritionDay, NutritionDayOption} from '../api/nutrition.ts';

import {nutrientNumber} from './nutrition-summary.ts';

export {
  ADHERENCE_RING,
  ADHERENCE_TEXT,
  type Adherence,
  adherenceDisplay,
  calorieShare,
  kcalText,
  nutrientNumber,
} from './nutrition-summary.ts';

export function optionCalories(option: NutritionDayOption): null | number {
  let total = 0;
  for (const item of option.items) {
    const calories = nutrientNumber(item.nutrients.calories);
    if (calories == null) {
      return null;
    }
    total += calories;
  }
  return total;
}

export type Targets = {calories: null | number; carbs: null | number; fat: null | number; protein: null | number};

export function dayTargets(day: null | NutritionDay | undefined): Targets {
  const t = day?.targets;
  return {
    calories: t?.calories ?? null,
    carbs: t?.carbs_g ?? null,
    fat: t?.fat_g ?? null,
    protein: t?.protein_g ?? null,
  };
}

/**
 * The day strip's label for one date: today names itself, every other day is
 * weekday plus day-and-month. Written against `en-US` so the two shapes stay
 * stable regardless of the device locale.
 */
export function dateLabel(date: string, today: string): string {
  const d = new Date(`${date}T00:00:00`);
  const weekday = d.toLocaleDateString('en-US', {weekday: 'short'});
  return date === today
    ? `Today \u00b7 ${weekday}`
    : `${weekday} \u00b7 ${d.toLocaleDateString('en-US', {day: 'numeric', month: 'short'})}`;
}
