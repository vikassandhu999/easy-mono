import {MEAL_SLOT_LABELS, type MealSlot} from '@easy/utils/meal-slots';

export type {MealSlot};

export function slotLabel(slot: MealSlot): string {
  return MEAL_SLOT_LABELS[slot];
}

export function liveOptionItems<Item>(slot: {
  meal_id?: string | null;
  options: {items: Item[]; meal_id: string | null}[];
}): Item[] {
  const active = slot.options.find((option) => option.meal_id === slot.meal_id) ?? slot.options[0];
  return active?.items ?? [];
}
