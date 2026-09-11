import type {NutritionMeal, NutritionMenu, NutritionPortion} from '../api/nutrition-plans';
export const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export const slots = [
  'early_morning',
  'breakfast',
  'mid_morning',
  'lunch',
  'afternoon',
  'evening',
  'dinner',
  'pre_sleep',
  'pre_workout',
  'during_workout',
  'post_workout',
] as const;
export function slotLabel(value: string) {
  return value.replaceAll('_', ' ');
}
export function emptyMenu(): NutritionMenu {
  const id = crypto.randomUUID();
  return {
    meals: [],
    day_patterns: [{id, name: 'Everyday', slots: []}],
    schedule: {monday: id, tuesday: id, wednesday: id, thursday: id, friday: id, saturday: id, sunday: id},
  };
}
export function newMeal(name: string): NutritionMeal {
  return {id: crypto.randomUUID(), name, notes: '', meal_items: []};
}
export function portionLabel(portion: NutritionPortion) {
  return portion.kind === 'gram' ? `${portion.grams} g` : `${portion.amount} ${portion.label || portion.unit}`;
}
export function validateMenu(menu: NutritionMenu): string | null {
  for (const pattern of menu.day_patterns) {
    if (!pattern.name.trim()) {
      return 'Name each day menu.';
    }
  }
  for (const meal of menu.meals) {
    if (!meal.name.trim()) {
      return 'Name each meal.';
    }
    for (const item of meal.meal_items) {
      const amount = item.portion.kind === 'gram' ? item.portion.grams : item.portion.amount;
      if (!Number.isFinite(amount) || amount <= 0) {
        return `Enter a portion greater than zero for ${item.name || 'each food'}.`;
      }
    }
  }
  return null;
}

export function removeMeal(menu: NutritionMenu, patternId: string, mealId: string): NutritionMenu {
  const day_patterns = menu.day_patterns.map((day) =>
    day.id !== patternId
      ? day
      : {
          ...day,
          slots: day.slots
            .map((slot) => ({...slot, meal_ids: slot.meal_ids.filter((id) => id !== mealId)}))
            .filter((slot) => slot.meal_ids.length > 0),
        },
  );
  const stillUsed = day_patterns.some((day) => day.slots.some((slot) => slot.meal_ids.includes(mealId)));
  return {...menu, day_patterns, meals: stillUsed ? menu.meals : menu.meals.filter((meal) => meal.id !== mealId)};
}
export function restoreMeal(
  menu: NutritionMenu,
  removed: {meal: NutritionMeal; patternId: string; slot: (typeof slots)[number]; index: number},
): NutritionMenu {
  return {
    ...menu,
    meals: menu.meals.some((meal) => meal.id === removed.meal.id) ? menu.meals : [...menu.meals, removed.meal],
    day_patterns: menu.day_patterns.map((day) =>
      day.id !== removed.patternId
        ? day
        : {
            ...day,
            slots: day.slots.some((slot) => slot.meal_slot === removed.slot)
              ? day.slots.map((slot) => {
                  if (slot.meal_slot !== removed.slot) {
                    return slot;
                  }
                  const ids = [...slot.meal_ids];
                  ids.splice(removed.index, 0, removed.meal.id);
                  return {...slot, meal_ids: ids};
                })
              : [...day.slots, {meal_slot: removed.slot, meal_ids: [removed.meal.id]}],
          },
    ),
  };
}
