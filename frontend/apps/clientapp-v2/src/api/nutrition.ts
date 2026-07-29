/**
 * Client nutrition. The "today" endpoint returns an opaque map; `asTodayPlan`
 * hand-types it. Targets come from the active plan summary (target_* columns);
 * consumed totals are summed FE-side from logged entries.
 */
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {foodKeys, mealLogKeys, nutritionPlanKeys, recipeKeys} from '@/api/keys';
import type {components, paths} from '@/api/schema';

export type Food = components['schemas']['Food'];
export type FoodLogEntry = components['schemas']['FoodLogEntry'];
type FoodLogEntryRequest = components['schemas']['FoodLogEntryRequest'];
export type MealLog = components['schemas']['MealLog'];
export type NutritionPlan = components['schemas']['NutritionPlan'];
export type Recipe = components['schemas']['Recipe'];
export type SwitchOptionRequest = components['schemas']['NutritionSwitchOptionRequest'];

type PlanListQuery = paths['/v1/client/nutrition-plans']['get']['parameters']['query'];
type MealLogListQuery = paths['/v1/client/nutrition-meal-logs']['get']['parameters']['query'];
type FoodListQuery = paths['/v1/client/nutrition-foods']['get']['parameters']['query'];
type RecipeListQuery = paths['/v1/client/nutrition-recipes']['get']['parameters']['query'];
type TodayQuery = paths['/v1/client/nutrition-plans/today']['get']['parameters']['query'];

type PlanListResponse = components['schemas']['NutritionPlanListResponse'];
type MealLogListResponse = components['schemas']['MealLogListResponse'];
type FoodListResponse = components['schemas']['FoodListResponse'];
type RecipeListResponse = components['schemas']['RecipeListResponse'];
type NutritionMapResponse = components['schemas']['NutritionMapResponse'];
type FoodLogEntryResponse = components['schemas']['FoodLogEntryResponse'];
type FoodLogEntryListResponse = components['schemas']['FoodLogEntryListResponse'];
type NutritionMealLogResponse = components['schemas']['NutritionMealLogResponse'];

// ── Queries ──────────────────────────────────────────────────

export function useListClientNutritionPlansQuery(query: PlanListQuery = {}) {
  return useQuery({
    queryKey: nutritionPlanKeys.list(query),
    queryFn: () => call(client.GET('/v1/client/nutrition-plans', {params: {query}})) as Promise<PlanListResponse>,
  });
}

export function useGetTodayNutritionPlanQuery(query: TodayQuery = {}) {
  return useQuery({
    queryKey: [...nutritionPlanKeys.today(), query],
    queryFn: () =>
      call(client.GET('/v1/client/nutrition-plans/today', {params: {query}})) as Promise<NutritionMapResponse>,
  });
}

export function useListClientMealLogsQuery(query: MealLogListQuery = {}) {
  return useQuery({
    queryKey: mealLogKeys.list(query),
    queryFn: () =>
      call(client.GET('/v1/client/nutrition-meal-logs', {params: {query}})) as Promise<MealLogListResponse>,
  });
}

export function useListClientFoodsQuery(query: FoodListQuery = {}, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: foodKeys.list(query),
    queryFn: () => call(client.GET('/v1/client/nutrition-foods', {params: {query}})) as Promise<FoodListResponse>,
    enabled: options?.enabled ?? true,
  });
}

export function useListClientRecipesQuery(query: RecipeListQuery = {}, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: recipeKeys.list(query),
    queryFn: () => call(client.GET('/v1/client/nutrition-recipes', {params: {query}})) as Promise<RecipeListResponse>,
    enabled: options?.enabled ?? true,
  });
}

// ── Log writes ───────────────────────────────────────────────
// Every write changes the day's meal logs → refresh the diary list.

/** Invalidate the meal-log lists after any write. */
function useInvalidateMealLogs() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({queryKey: mealLogKeys.lists()});
}

export function useCreateFoodLogEntryMutation() {
  const invalidate = useInvalidateMealLogs();
  return useMutation({
    mutationFn: (body: FoodLogEntryRequest) =>
      call(client.POST('/v1/client/nutrition-food-log-entries', {body})) as Promise<FoodLogEntryResponse>,
    onSuccess: invalidate,
  });
}

export function useUpdateFoodLogEntryMutation() {
  const invalidate = useInvalidateMealLogs();
  return useMutation({
    mutationFn: ({id, ...body}: FoodLogEntryRequest & {id: string}) =>
      call(
        client.PATCH('/v1/client/nutrition-food-log-entries/{id}', {params: {path: {id}}, body}),
      ) as Promise<FoodLogEntryResponse>,
    onSuccess: invalidate,
  });
}

export function useDeleteFoodLogEntryMutation() {
  const invalidate = useInvalidateMealLogs();
  return useMutation({
    mutationFn: (id: string) =>
      call(client.DELETE('/v1/client/nutrition-food-log-entries/{id}', {params: {path: {id}}})),
    onSuccess: invalidate,
  });
}

export function useLogMealMutation() {
  const invalidate = useInvalidateMealLogs();
  return useMutation({
    mutationFn: (body: FoodLogEntryRequest) =>
      call(client.POST('/v1/client/nutrition-food-log-entries/log-meal', {body})) as Promise<FoodLogEntryListResponse>,
    onSuccess: invalidate,
  });
}

export function useLogDayMutation() {
  const invalidate = useInvalidateMealLogs();
  return useMutation({
    mutationFn: (body: FoodLogEntryRequest) =>
      call(client.POST('/v1/client/nutrition-food-log-entries/log-day', {body})) as Promise<FoodLogEntryListResponse>,
    onSuccess: invalidate,
  });
}

export function useSwitchNutritionMealOptionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SwitchOptionRequest) =>
      call(
        client.POST('/v1/client/nutrition-food-log-entries/switch-option', {body}),
      ) as Promise<NutritionMealLogResponse>,
    onSuccess: () => {
      qc.invalidateQueries({queryKey: mealLogKeys.lists()});
      qc.invalidateQueries({queryKey: nutritionPlanKeys.today()});
    },
  });
}

// ── Hand-typed view-model over the opaque `today` payload ─────────────────────
// GET /nutrition-plans/today returns {data: object}; its real shape is below.
// `nutrition` is per-100g for food items but whole-recipe totals for recipe items.
export type TodayPlanItem = {
  amount: null | number;
  food_id: null | string;
  food_name: null | string;
  meal_item_id: string;
  nutrition: null | Record<string, null | number>;
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
type TodayPlanSlot = {
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
