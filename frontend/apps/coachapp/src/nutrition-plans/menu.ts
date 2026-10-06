import type {NutritionContent, NutritionMeal} from '../api/nutrition-plans';
export const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export const slotSuggestions = [
  'Early morning',
  'Breakfast',
  'Mid morning',
  'Lunch',
  'Afternoon',
  'Evening',
  'Dinner',
  'Before sleep',
  'Before workout',
  'During workout',
  'After workout',
];
export function emptyContent(): NutritionContent {
  const id = crypto.randomUUID();
  return {
    targets: {},
    meals: [],
    day_patterns: [{id, name: 'Everyday', slots: []}],
    schedule: {cycle_weeks: 1, entries: weekdays.map((_, day) => ({id: crypto.randomUUID(), day, ref: id}))},
  };
}
export function newMeal(name: string): NutritionMeal {
  return {id: crypto.randomUUID(), name, notes: '', items: []};
}
export function removeMeal(content: NutritionContent, id: string): NutritionContent {
  return {
    ...content,
    meals: content.meals.filter((meal) => meal.id !== id),
    day_patterns: content.day_patterns.map((pattern) => ({
      ...pattern,
      slots: pattern.slots.map((slot) => ({...slot, meal_ids: slot.meal_ids.filter((mealId) => mealId !== id)})),
    })),
  };
}
export function removePattern(content: NutritionContent, id: string, replacementId: string): NutritionContent {
  if (id === replacementId || !content.day_patterns.some((pattern) => pattern.id === replacementId)) {
    return content;
  }
  return {
    ...content,
    day_patterns: content.day_patterns.filter((pattern) => pattern.id !== id),
    schedule: {
      ...content.schedule,
      entries: content.schedule.entries.map((entry) => (entry.ref === id ? {...entry, ref: replacementId} : entry)),
    },
  };
}
export function validateContent(content: NutritionContent): string | null {
  for (const targets of [content.targets, ...content.day_patterns.map((pattern) => pattern.targets ?? {})]) {
    for (const range of Object.values(targets)) {
      if (range.min != null && range.max != null && range.min > range.max) {
        return 'The minimum target must not exceed the maximum.';
      }
    }
  }
  for (const pattern of content.day_patterns) {
    if (!pattern.name.trim()) {
      return 'Name each day pattern.';
    }
    if (pattern.slots.some((slot) => !slot.name.trim())) {
      return 'Name each meal slot.';
    }
    if (new Set(pattern.slots.map((slot) => slot.name.trim())).size !== pattern.slots.length) {
      return 'Use a different name for each slot in a day pattern.';
    }
  }
  for (const meal of content.meals) {
    if (!meal.name.trim()) {
      return 'Name each meal.';
    }
    for (const item of meal.items) {
      const amount = item.portion.type === 'grams' ? item.portion.grams : item.portion.amount;
      if (!Number.isFinite(amount) || amount <= 0) {
        return `Enter a positive portion for ${item.name || 'each food'}.`;
      }
    }
  }
  return null;
}
