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
export type MenuIssue =
  | {kind: 'day'; dayId: string; message: string}
  | {kind: 'meal'; mealId: string; message: string}
  | {kind: 'portion'; mealId: string; itemId: string; message: string};

export function validateMenu(menu: NutritionMenu): MenuIssue | null {
  for (const pattern of menu.day_patterns) {
    if (!pattern.name.trim()) {
      return {kind: 'day', dayId: pattern.id, message: 'Name each day menu.'};
    }
  }
  for (const meal of menu.meals) {
    if (!meal.name.trim()) {
      return {kind: 'meal', mealId: meal.id, message: 'Name each meal.'};
    }
    for (const item of meal.meal_items) {
      const amount = item.portion.kind === 'gram' ? item.portion.grams : item.portion.amount;
      if (!Number.isFinite(amount) || amount <= 0) {
        return {
          kind: 'portion',
          mealId: meal.id,
          itemId: item.id,
          message: `Enter a portion greater than zero for ${item.name || 'each food'}.`,
        };
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

export function removeDayMenu(menu: NutritionMenu, patternId: string, replacementId: string) {
  const pattern = menu.day_patterns.find((day) => day.id === patternId);
  if (!pattern || patternId === replacementId || !menu.day_patterns.some((day) => day.id === replacementId)) {
    return null;
  }
  const day_patterns = menu.day_patterns.filter((day) => day.id !== patternId);
  const remainingMeals = new Set(day_patterns.flatMap((day) => day.slots.flatMap((slot) => slot.meal_ids)));
  const patternMeals = new Set(pattern.slots.flatMap((slot) => slot.meal_ids));
  const removedMeals = menu.meals.filter((meal) => patternMeals.has(meal.id));
  const days = weekdays.filter((day) => menu.schedule[day] === patternId);
  const schedule = {...menu.schedule};
  for (const day of days) {
    schedule[day] = replacementId;
  }
  return {
    menu: {...menu, day_patterns, schedule, meals: menu.meals.filter((meal) => remainingMeals.has(meal.id))},
    removed: {pattern, index: menu.day_patterns.indexOf(pattern), meals: removedMeals, days, replacementId},
  };
}

export function restoreDayMenu(
  menu: NutritionMenu,
  removed: NonNullable<ReturnType<typeof removeDayMenu>>['removed'],
): NutritionMenu {
  if (menu.day_patterns.some((day) => day.id === removed.pattern.id)) {
    return menu;
  }
  const day_patterns = [...menu.day_patterns];
  day_patterns.splice(removed.index, 0, removed.pattern);
  const schedule = {...menu.schedule};
  for (const day of removed.days) {
    if (schedule[day] === removed.replacementId) {
      schedule[day] = removed.pattern.id;
    }
  }
  return {
    ...menu,
    day_patterns,
    schedule,
    meals: [...menu.meals, ...removed.meals.filter((meal) => !menu.meals.some((value) => value.id === meal.id))],
  };
}
