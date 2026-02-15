import type { PlanItem } from "@/api/nutritionPlans";

export const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export const MEAL_TYPES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "pre_workout",
  "post_workout",
] as const;

export type MealItemDraft = {
  amount: string;
  unit: string;
  weight_g: string;
};

export type PlanItemDraft = {
  day: string;
  meal_id: string;
  meal_type: string;
};

export const toSentenceLabel = (value: string) => {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
