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

export type MealSlot = (typeof MEAL_SLOTS)[number];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
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
