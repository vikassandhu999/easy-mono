/**
 * Client nutrition — new schema (generated client). Replaces the old hand-written
 * foods/mealLogs/nutritionPlans/recipes wrappers. The "today" endpoint returns an
 * opaque map; `asTodayPlan` hand-types it. Targets come from the active plan summary
 * (target_* columns); consumed totals are summed FE-side from logged entries.
 */
import {
  clientApi,
  useCreateFoodLogEntryMutation,
  useDeleteFoodLogEntryMutation,
  useGetTodayNutritionPlanQuery,
  useLazyListClientFoodsQuery,
  useLazyListClientRecipesQuery,
  useListClientMealLogsQuery,
  useListClientNutritionPlansQuery,
  useLogDayMutation,
  useLogMealMutation,
  useSwitchNutritionMealOptionMutation,
  useUpdateFoodLogEntryMutation,
} from '@/api/generated';

export type {
  Food,
  FoodLogEntry,
  FoodLogEntryRequest,
  FoodServingSize,
  MealLog,
  NutritionPlan,
  Recipe,
} from '@/api/generated';

export {
  useCreateFoodLogEntryMutation,
  useDeleteFoodLogEntryMutation,
  useGetTodayNutritionPlanQuery,
  useLazyListClientFoodsQuery,
  useLazyListClientRecipesQuery,
  useListClientMealLogsQuery,
  useListClientNutritionPlansQuery,
  useLogDayMutation,
  useLogMealMutation,
  useSwitchNutritionMealOptionMutation,
  useUpdateFoodLogEntryMutation,
};

// ── Hand-typed view-model over the opaque `today` payload ─────────────────────
// GET /nutrition-plans/today returns {data: object}; its real shape is below.
// `nutrition` is per-100g for food items but whole-recipe totals for recipe items.
export type TodayPlanItem = {
  amount: null | number;
  food_id: null | string;
  food_name: null | string;
  meal_item_id: string;
  nutrition: null | Record<string, null | number>;
  // the planned item's position — matches the food log entry's planned_item_index
  position: number;
  recipe_id: null | string;
  unit: null | string;
  weight_g: null | number;
};
export type TodayPlanOption = {
  items: TodayPlanItem[];
  meal_id: string;
  meal_name: null | string;
  position: number;
};
export type TodayPlanSlot = {
  chosen_meal_id: null | string;
  meal_slot: string;
  options: TodayPlanOption[];
};
export type TodayPlan = {
  date: string;
  day: string;
  plan_id: string;
  slots: TodayPlanSlot[];
};

export function asTodayPlan(resp: undefined | {data?: unknown}): null | TodayPlan {
  const data = resp?.data;
  return data && typeof data === 'object' ? (data as TodayPlan) : null;
}

// Display calories for a planned item. Foods scale per-100g by weight_g; recipes use
// the whole-recipe total the today payload provides (its only figure for recipes).
// ponytail: recipe display kcal isn't portion-scaled here — the today payload doesn't
// expose servings/cooked weight. Logged entries get correct macros from the backend.
export function plannedItemCalories(item: TodayPlanItem): null | number {
  const n = item.nutrition;
  if (!n) {
    return null;
  }
  if (item.recipe_id) {
    return n.calories ?? null;
  }
  const per100 = n.calories_per_100g;
  return per100 != null && item.weight_g != null ? (per100 * item.weight_g) / 100 : null;
}

clientApi.enhanceEndpoints({
  endpoints: {
    // Every log write changes the day's meal logs → refresh the diary list.
    createFoodLogEntry: {invalidatesTags: [{id: 'LIST', type: 'MealLog'}]},
    deleteFoodLogEntry: {invalidatesTags: [{id: 'LIST', type: 'MealLog'}]},
    getTodayNutritionPlan: {providesTags: [{id: 'TODAY', type: 'NutritionPlan'}]},
    listClientMealLogs: {providesTags: [{id: 'LIST', type: 'MealLog'}]},
    listClientNutritionPlans: {providesTags: [{id: 'LIST', type: 'NutritionPlan'}]},
    logDay: {invalidatesTags: [{id: 'LIST', type: 'MealLog'}]},
    logMeal: {invalidatesTags: [{id: 'LIST', type: 'MealLog'}]},
    switchNutritionMealOption: {
      invalidatesTags: [
        {id: 'LIST', type: 'MealLog'},
        {id: 'TODAY', type: 'NutritionPlan'},
      ],
    },
    updateFoodLogEntry: {invalidatesTags: [{id: 'LIST', type: 'MealLog'}]},
  },
});
