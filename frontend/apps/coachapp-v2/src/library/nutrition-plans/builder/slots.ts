import {
  MEAL_SLOT_LABELS,
  MEAL_SLOTS,
  type MealSlot,
  ORDINARY_MEAL_SLOTS,
  WORKOUT_MEAL_SLOTS,
} from '@easy/utils/meal-slots';

export {MEAL_SLOTS, ORDINARY_MEAL_SLOTS, WORKOUT_MEAL_SLOTS};

export type BuilderMealSlot = MealSlot;

export const SLOT_LABELS = MEAL_SLOT_LABELS;

export function slotLabel(slot: MealSlot): string {
  return MEAL_SLOT_LABELS[slot];
}

export function flattenSlots<Option extends {id: string; position: number; nutrition_meal_id: string}>(pattern: {
  slots: {meal_slot: MealSlot; options: Option[]}[];
}): Array<Option & {meal_slot: MealSlot}> {
  const bySlot = new Map(pattern.slots.map((slot) => [slot.meal_slot, slot.options]));
  return MEAL_SLOTS.flatMap((meal_slot) =>
    [...(bySlot.get(meal_slot) ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((option) => ({...option, meal_slot})),
  );
}
