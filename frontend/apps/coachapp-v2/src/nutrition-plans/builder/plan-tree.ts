/**
 * Finding things in a nutrition plan. Used against both the live plan and an
 * immer draft of it, which is why these take the plan rather than closing over
 * one. No React, no cache.
 *
 * The slot options model maps onto the redesign directly: the position-0
 * option of a slot is the meal card, and the remaining options are that meal's
 * `Client can swap with` alternates.
 */
import {WEEKDAY_SHORT_LABELS, WEEKDAYS} from '@easy/utils';

import type {
  NutritionDayPattern,
  NutritionDayPatternSlot,
  NutritionMeal,
  NutritionMealItem,
  NutritionMealOption,
  NutritionPlan,
} from '@/api/nutrition-plan-builder';

import {flattenSlots, MEAL_SLOTS, slotLabel, type BuilderMealSlot} from './slots';

export {flattenSlots};

/** Internal builder view of a Day Pattern: slot options flattened with their Meal Slot. */
export type NutritionDayMeal = NutritionMealOption & {meal_slot: NutritionDayPatternSlot['meal_slot']};
export type NutritionPlanDay = NutritionDayPattern & {day_meals: NutritionDayMeal[]};

/** Mon..Sun map of Day Pattern ids — `plan.schedule` with its null guard. */
export type WeekdayAssignments = Record<string, string | null | undefined>;

export function getDays(plan: NutritionPlan): NutritionPlanDay[] {
  return (plan.day_patterns ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((pattern) => ({...pattern, day_meals: flattenSlots(pattern)}));
}

export function getWeekdayAssignments(plan: NutritionPlan): WeekdayAssignments {
  return plan.schedule ?? {};
}

export function findPattern(plan: NutritionPlan, dayId: string): NutritionDayPattern | undefined {
  return plan.day_patterns.find((pattern) => pattern.id === dayId);
}

export function findDay(plan: NutritionPlan, dayId: string): NutritionPlanDay | undefined {
  return getDays(plan).find((day) => day.id === dayId);
}

export function findMeal(plan: NutritionPlan, mealId: string): NutritionMeal | undefined {
  return plan.meals.find((meal) => meal.id === mealId);
}

export function findItem(
  plan: NutritionPlan,
  itemId: string,
): {item: NutritionMealItem; meal: NutritionMeal} | undefined {
  for (const meal of plan.meals) {
    const item = meal.meal_items.find((candidate) => candidate.id === itemId);
    if (item) {
      return {item, meal};
    }
  }
  return undefined;
}

export function optionsForSlot(day: NutritionPlanDay, slot: string): NutritionDayMeal[] {
  return day.day_meals.filter((dm) => dm.meal_slot === slot).sort((a, b) => a.position - b.position);
}

/** Day rows in slot order: the position-0 option plus its alternates. */
export function slotRows(
  day: NutritionPlanDay,
): {slot: BuilderMealSlot; primary: NutritionDayMeal; alternates: NutritionDayMeal[]}[] {
  const rows: {slot: BuilderMealSlot; primary: NutritionDayMeal; alternates: NutritionDayMeal[]}[] = [];
  for (const slot of MEAL_SLOTS) {
    const options = optionsForSlot(day, slot);
    const primary = options[0];
    if (primary) {
      rows.push({slot, primary, alternates: options.slice(1)});
    }
  }
  return rows;
}

/** First slot with nothing on it — where a newly added meal lands. */
export function firstFreeSlot(day: NutritionPlanDay): BuilderMealSlot {
  return MEAL_SLOTS.find((slot) => optionsForSlot(day, slot).length === 0) ?? MEAL_SLOTS[0]!;
}

/** Every day-slot option across the plan that points at a meal — drives "Used in n places". */
export function assignmentCounts(days: NutritionPlanDay[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const day of days) {
    for (const dm of day.day_meals) {
      counts.set(dm.nutrition_meal_id, (counts.get(dm.nutrition_meal_id) ?? 0) + 1);
    }
  }
  return counts;
}

/** "On Mon, Tue · Lunch" — where a plan meal already sits, for the reuse list. */
export function mealPlacementSummary(mealId: string, days: NutritionPlanDay[], weekdays: WeekdayAssignments): string {
  const parts: string[] = [];
  const dayNames = days.filter((d) => d.day_meals.some((dm) => dm.nutrition_meal_id === mealId));
  if (dayNames.length > 0) {
    const labels = WEEKDAYS.filter((w) => dayNames.some((d) => weekdays[w] === d.id)).map(
      (w) => WEEKDAY_SHORT_LABELS[w] ?? w,
    );
    parts.push(`On ${labels.length > 0 ? labels.join(', ') : dayNames.map((d) => d.name).join(', ')}`);
  }
  const slot = dayNames.flatMap((d) => d.day_meals).find((dm) => dm.nutrition_meal_id === mealId)?.meal_slot;
  if (slot) {
    parts.push(slotLabel(slot));
  }
  return parts.join(' · ');
}
