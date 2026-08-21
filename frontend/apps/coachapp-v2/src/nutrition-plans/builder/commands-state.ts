import {portionWireFromInput} from '@easy/utils/nutrition-portion';
import type {NutritionDayPatternSlot, NutritionPlan, NutritionPortionInput} from '../../api/nutrition-plan-builder.ts';

type DayPattern = NutritionPlan['day_patterns'][number];
type Slot = NutritionDayPatternSlot;
type Option = Slot['options'][number];
type Meal = NutritionPlan['meals'][number];
type Item = Meal['meal_items'][number];
type PlanSlots = {
  day_patterns: Array<
    Pick<DayPattern, 'id'> & {
      slots: Array<Pick<Slot, 'meal_slot'> & {options: Pick<Option, 'id' | 'nutrition_meal_id' | 'position'>[]}>;
    }
  >;
};
type PlanMeals = {meals: Array<Pick<Meal, 'id'> & {meal_items: Array<Pick<Item, 'id' | 'portion'>>}>};

export function changeOptionSlot(
  plan: PlanSlots,
  dayId: string,
  optionId: string,
  nextSlot: NutritionDayPatternSlot['meal_slot'],
) {
  const pattern = plan.day_patterns.find((candidate) => candidate.id === dayId);
  const source = pattern?.slots.find((slot) => slot.options.some((option) => option.id === optionId));
  if (!pattern || !source || source.meal_slot === nextSlot) {
    return;
  }

  const moved = source.options.find((option) => option.id === optionId);
  if (!moved) {
    return;
  }

  source.options = source.options.filter((option) => option.id !== optionId);
  source.options.forEach((option, position) => {
    option.position = position;
  });

  let target = pattern.slots.find((slot) => slot.meal_slot === nextSlot);
  if (!target) {
    target = {meal_slot: nextSlot, options: []};
    pattern.slots.push(target);
  }
  target.options.push({...moved, position: target.options.length});
  pattern.slots = pattern.slots.filter((slot) => slot.options.length > 0);
}

export function copyWithItemPortion<T extends PlanMeals>(
  plan: T,
  itemId: string,
  portion: NutritionPortionInput,
): T | undefined {
  const copied = structuredClone(plan);

  for (const meal of copied.meals) {
    const item = meal.meal_items.find((candidate) => candidate.id === itemId);
    if (item) {
      item.portion = portionWireFromInput(portion);
      return copied;
    }
  }

  return undefined;
}
