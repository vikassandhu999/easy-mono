import type {NutritionDayPatternSlot, NutritionMealOption} from '../../../api/nutrition-plan-builder.ts';

type MutableMenuOption = Pick<NutritionMealOption, 'nutrition_meal_id' | 'position'>;
type MutableMenuSlot = Pick<NutritionDayPatternSlot, 'meal_slot'> & {options: MutableMenuOption[]};
type MutablePattern = {slots: MutableMenuSlot[]};
type MutablePlanPatterns = {day_patterns: MutablePattern[]};

export function dropEmptySlots(pattern: MutablePattern) {
  pattern.slots = pattern.slots.filter((slot) => slot.options.length > 0);
}

export function reindexSlotOptions(pattern: MutablePattern, mealSlot: string) {
  const slot = pattern.slots.find((candidate) => candidate.meal_slot === mealSlot);
  slot?.options.forEach((option, position) => {
    option.position = position;
  });
}

export function removeMealFromPatterns(plan: MutablePlanPatterns, mealId: string) {
  for (const pattern of plan.day_patterns) {
    for (const slot of pattern.slots) {
      slot.options = slot.options.filter((option) => option.nutrition_meal_id !== mealId);
    }
    dropEmptySlots(pattern);
  }
}
