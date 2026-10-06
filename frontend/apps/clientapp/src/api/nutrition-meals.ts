import type {DiaryMeal, DiaryMealInput, NutritionDay} from './schema';

export function findSavedMeal(
  day: Pick<NutritionDay, 'slots' | 'extra_meals'>,
  input: Pick<DiaryMealInput, 'id' | 'slot_id' | 'name'>,
): DiaryMeal | undefined {
  const meals = [...day.slots.flatMap((slot) => (slot.meal ? [slot.meal] : [])), ...day.extra_meals];
  return (
    meals.find((meal) => meal.id === input.id) ??
    meals.find((meal) =>
      input.slot_id ? meal.slot_id === input.slot_id : meal.slot_id === null && meal.name === input.name,
    )
  );
}

export class MealNameConflict extends Error {
  constructor() {
    super('Meal name is already used. Enter a different name.');
  }
}

export function assertMealNameAvailable(
  day: Pick<NutritionDay, 'slots' | 'extra_meals'>,
  input: Pick<DiaryMealInput, 'id' | 'slot_id' | 'name'>,
) {
  const meals = [...day.slots.flatMap((slot) => (slot.meal ? [slot.meal] : [])), ...day.extra_meals];
  if (meals.some((meal) => meal.name === input.name && meal.id !== input.id && meal.slot_id !== input.slot_id)) {
    throw new MealNameConflict();
  }
}
