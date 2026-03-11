import type {PlanItem} from '@/entities/nutritionPlans/api/nutritionPlans';

import {toSentenceCase} from '@/shared/lib/format/formatHelpers';

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'] as const;

export const toSentenceLabel = (value: string) => {
  return toSentenceCase(value);
};

export const getItemsByDay = (planItems: PlanItem[]) => {
  const itemsByDay = DAYS.reduce<Record<string, PlanItem[]>>((acc, day) => {
    acc[day] = [];
    return acc;
  }, {});

  for (const item of planItems) {
    const dayItems = itemsByDay[item.day] ?? [];
    dayItems.push(item);
    itemsByDay[item.day] = dayItems;
  }

  return itemsByDay;
};

export const getMealUsageCountByMealId = (planItems: PlanItem[]) => {
  return planItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.meal_id] = (acc[item.meal_id] ?? 0) + 1;
    return acc;
  }, {});
};

export const getDayMealCounts = (itemsByDay: Record<string, PlanItem[]>) => {
  return DAYS.reduce<Record<string, number>>((acc, day) => {
    acc[day] = itemsByDay[day]?.length ?? 0;
    return acc;
  }, {});
};

const MEAL_TYPE_SORT_WEIGHT: Record<string, number> = {
  breakfast: 0,
  dinner: 5,
  lunch: 2,
  post_workout: 4,
  pre_workout: 1,
  snack: 3,
};

export const getPlanItemSortWeight = (mealType: string): number => MEAL_TYPE_SORT_WEIGHT[mealType] ?? 99;
