/**
 * Client nutrition. Day view is GET /nutrition-days (targets + options + diary
 * rows). Writes are typed verbs under /nutrition-food-log-entries/*.
 */
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {foodKeys, nutritionDayKeys, nutritionPlanKeys, recipeKeys} from '@/api/keys';
import type {components, paths} from '@/api/schema';

export type Food = components['schemas']['Food'];
export type FoodLogEntry = components['schemas']['FoodLogEntry'];
export type NutritionDay = components['schemas']['NutritionDay'];
export type NutritionDayOption = components['schemas']['NutritionDayOption'];
export type NutritionDayOptionItem = components['schemas']['NutritionDayOptionItem'];
export type NutritionDaySlot = components['schemas']['NutritionDaySlot'];
export type NutritionPlan = components['schemas']['NutritionPlan'];
export type Recipe = components['schemas']['Recipe'];
export type SwitchOptionRequest = components['schemas']['NutritionSwitchOptionRequest'];

/** @deprecated Prefer NutritionDayOptionItem — kept as alias for amount sheet. */
export type TodayPlanItem = NutritionDayOptionItem;
/** @deprecated Prefer NutritionDayOption. */
export type TodayPlanOption = NutritionDayOption;

type PlanListQuery = paths['/v1/client/nutrition-plans']['get']['parameters']['query'];
type NutritionDayQuery = paths['/v1/client/nutrition-days']['get']['parameters']['query'];
type FoodListQuery = paths['/v1/client/nutrition-foods']['get']['parameters']['query'];
type RecipeListQuery = paths['/v1/client/nutrition-recipes']['get']['parameters']['query'];

type PlanListResponse = components['schemas']['NutritionPlanListResponse'];
type NutritionDayListResponse = components['schemas']['NutritionDayListResponse'];
type FoodListResponse = components['schemas']['FoodListResponse'];
type RecipeListResponse = components['schemas']['RecipeListResponse'];
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

export function useListClientNutritionDaysQuery(query: NutritionDayQuery = {}) {
  return useQuery({
    queryKey: nutritionDayKeys.list(query),
    queryFn: () =>
      call(client.GET('/v1/client/nutrition-days', {params: {query}})) as Promise<NutritionDayListResponse>,
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

function useInvalidateNutritionDays() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({queryKey: nutritionDayKeys.lists()});
  };
}

type LogPlannedItemRequest = components['schemas']['LogPlannedItemRequest'];
type AddExtraRequest = components['schemas']['AddExtraRequest'];
type ReplaceItemRequest = components['schemas']['ReplaceItemRequest'];
type LogMealRequest = components['schemas']['LogMealRequest'];
type LogDayRequest = components['schemas']['LogDayRequest'];
type UpdatePortionRequest = components['schemas']['UpdatePortionRequest'];

export function useLogPlannedItemMutation() {
  const invalidate = useInvalidateNutritionDays();
  return useMutation({
    mutationFn: (body: LogPlannedItemRequest) =>
      call(
        client.POST('/v1/client/nutrition-food-log-entries/log-planned-item', {body}),
      ) as Promise<FoodLogEntryResponse>,
    onSuccess: invalidate,
  });
}

export function useAddExtraMutation() {
  const invalidate = useInvalidateNutritionDays();
  return useMutation({
    mutationFn: (body: AddExtraRequest) =>
      call(
        client.POST('/v1/client/nutrition-food-log-entries/add-extra', {body}),
      ) as Promise<FoodLogEntryResponse>,
    onSuccess: invalidate,
  });
}

export function useReplaceItemMutation() {
  const invalidate = useInvalidateNutritionDays();
  return useMutation({
    mutationFn: (body: ReplaceItemRequest) =>
      call(
        client.POST('/v1/client/nutrition-food-log-entries/replace-item', {body}),
      ) as Promise<FoodLogEntryResponse>,
    onSuccess: invalidate,
  });
}

export function useUpdateFoodLogEntryMutation() {
  const invalidate = useInvalidateNutritionDays();
  return useMutation({
    mutationFn: ({id, ...body}: UpdatePortionRequest & {id: string}) =>
      call(
        client.PATCH('/v1/client/nutrition-food-log-entries/{id}', {params: {path: {id}}, body}),
      ) as Promise<FoodLogEntryResponse>,
    onSuccess: invalidate,
  });
}

export function useDeleteFoodLogEntryMutation() {
  const invalidate = useInvalidateNutritionDays();
  return useMutation({
    mutationFn: (id: string) =>
      call(client.DELETE('/v1/client/nutrition-food-log-entries/{id}', {params: {path: {id}}})),
    onSuccess: invalidate,
  });
}

export function useLogMealMutation() {
  const invalidate = useInvalidateNutritionDays();
  return useMutation({
    mutationFn: (body: LogMealRequest) =>
      call(client.POST('/v1/client/nutrition-food-log-entries/log-meal', {body})) as Promise<FoodLogEntryListResponse>,
    onSuccess: invalidate,
  });
}

export function useLogDayMutation() {
  const invalidate = useInvalidateNutritionDays();
  return useMutation({
    mutationFn: (body: LogDayRequest) =>
      call(client.POST('/v1/client/nutrition-food-log-entries/log-day', {body})) as Promise<FoodLogEntryListResponse>,
    onSuccess: invalidate,
  });
}

export function useSwitchNutritionMealOptionMutation() {
  const invalidate = useInvalidateNutritionDays();
  return useMutation({
    mutationFn: (body: SwitchOptionRequest) =>
      call(
        client.POST('/v1/client/nutrition-food-log-entries/switch-option', {body}),
      ) as Promise<NutritionMealLogResponse>,
    onSuccess: invalidate,
  });
}

// Display calories for a live option item. Foods scale per-100g by weight_g;
// recipes use the whole-recipe total the option payload provides.
export function plannedItemCalories(item: NutritionDayOptionItem): null | number {
  const n = item.nutrition as null | Record<string, null | number> | undefined;
  if (!n) {
    return null;
  }
  if (item.recipe_id) {
    return n.calories ?? null;
  }
  const per100 = n.calories_per_100g;
  return per100 != null && item.weight_g != null ? (per100 * item.weight_g) / 100 : null;
}
