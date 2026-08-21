/**
 * Sentence-case slot names, per the Meal Slot vocabulary. Ordinary day-period
 * slots come first; the workout group follows. Display copy can change without
 * renaming the machine values.
 */
export const ORDINARY_MEAL_SLOTS = [
  'early_morning',
  'breakfast',
  'mid_morning',
  'lunch',
  'afternoon',
  'evening',
  'dinner',
  'pre_sleep',
] as const;

export const WORKOUT_MEAL_SLOTS = ['pre_workout', 'during_workout', 'post_workout'] as const;

export const MEAL_SLOTS = [...ORDINARY_MEAL_SLOTS, ...WORKOUT_MEAL_SLOTS] as const;

export type BuilderMealSlot = (typeof MEAL_SLOTS)[number];

export const SLOT_LABELS: Record<BuilderMealSlot, string> = {
  afternoon: 'After lunch',
  breakfast: 'Breakfast',
  dinner: 'Dinner',
  during_workout: 'During workout',
  early_morning: 'Early morning',
  evening: 'Evening',
  lunch: 'Lunch',
  mid_morning: 'After breakfast',
  post_workout: 'After workout',
  pre_sleep: 'Before sleep',
  pre_workout: 'Before workout',
};

export function slotLabel(slot: string): string {
  return SLOT_LABELS[slot as BuilderMealSlot] ?? slot;
}

export function flattenSlots<Option extends {id: string; position: number; nutrition_meal_id: string}>(pattern: {
  slots: {meal_slot: BuilderMealSlot; options: Option[]}[];
}): Array<Option & {meal_slot: BuilderMealSlot}> {
  const bySlot = new Map(pattern.slots.map((slot) => [slot.meal_slot, slot.options]));
  return MEAL_SLOTS.flatMap((meal_slot) =>
    [...(bySlot.get(meal_slot) ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((option) => ({...option, meal_slot})),
  );
}
