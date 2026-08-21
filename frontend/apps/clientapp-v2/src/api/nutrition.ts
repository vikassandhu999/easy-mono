/**
 * Client nutrition. Day view is GET /nutrition-days (targets + options + diary
 * rows). Diary writes go through /nutrition-days/{date}/* with an Idempotency-Key.
 */
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {foodKeys, nutritionDayKeys, recipeKeys} from '@/api/keys';
import type {components, paths} from '@/api/schema';
import {getApiErrorCode} from '@/api/shared';

export type Food = components['schemas']['Food'];
export type NutritionDay = components['schemas']['NutritionDay'];
export type NutritionDayEntry = components['schemas']['NutritionDayEntry'];
export type NutritionDayOption = components['schemas']['NutritionDayOption'];
export type NutritionDayOptionItem = components['schemas']['NutritionDayOptionItem'];
export type NutritionDayRow = components['schemas']['NutritionDayRow'];
export type NutritionDaySlot = components['schemas']['NutritionDaySlot'];
export type DiaryMealSlot = NutritionDaySlot['meal_slot'];
export type MealSlot = DiaryMealSlot;
export type Recipe = components['schemas']['Recipe'];
export type SwitchOptionRequest = components['schemas']['DiarySwitchOptionRequest'];
export type ReplacePlannedItemRequest = components['schemas']['DiaryReplacePlannedItemRequest'];
export type UpdateDiaryEntryRequest = components['schemas']['DiaryUpdateEntryRequest'];
export type DeleteDiaryEntryRequest = components['schemas']['DiaryDeleteEntryRequest'];

/** Parsed portion — impossible sibling-null states removed at the boundary. */
export type ParsedNutritionPortion =
  | {grams: number; kind: 'gram'}
  | {amount: number; kind: 'serving'; label: null | string; unit: string};

export type NutritionItemRef = {food_id: string; kind: 'food'} | {kind: 'recipe'; recipe_id: string};

export {
  formatParsedPortion,
  parseNutritionPortion,
  portionWireFromInput,
  toPortionInput,
  toPortionWire,
} from '@easy/utils/nutrition-portion';
export {pickedToItemRef, toItemInput} from '@easy/utils/nutrition-item-ref';

type NutritionDayQuery = paths['/v1/client/nutrition-days']['get']['parameters']['query'];
type FoodListQuery = paths['/v1/client/nutrition-foods']['get']['parameters']['query'];
type RecipeListQuery = paths['/v1/client/nutrition-recipes']['get']['parameters']['query'];

// ── Queries ──────────────────────────────────────────────────

export function useListClientNutritionDaysQuery(query: NutritionDayQuery = {}, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: nutritionDayKeys.list(query),
    queryFn: () => call(client.GET('/v1/client/nutrition-days', {params: {query}})),
    enabled: options?.enabled ?? true,
  });
}

export function useListClientFoodsQuery(query: FoodListQuery = {}, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: foodKeys.list(query),
    queryFn: () => call(client.GET('/v1/client/nutrition-foods', {params: {query}})),
    enabled: options?.enabled ?? true,
  });
}

export function useListClientRecipesQuery(query: RecipeListQuery = {}, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: recipeKeys.list(query),
    queryFn: () => call(client.GET('/v1/client/nutrition-recipes', {params: {query}})),
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

type AddExtraRequest = components['schemas']['DiaryAddExtraRequest'];
type LogPlannedItemRequest = components['schemas']['DiaryLogPlannedItemRequest'];
type LogPlannedOptionRequest = components['schemas']['DiaryLogPlannedOptionRequest'];

export function useLogPlannedItemMutation() {
  const invalidate = useInvalidateNutritionDays();
  return useMutation({
    mutationFn: ({date, idempotencyKey, ...body}: LogPlannedItemRequest & {date: string; idempotencyKey: string}) =>
      call(
        client.POST('/v1/client/nutrition-days/{date}/planned-items', {
          params: {path: {date}, header: {'Idempotency-Key': idempotencyKey}},
          body,
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useAddExtraMutation() {
  const invalidate = useInvalidateNutritionDays();
  return useMutation({
    mutationFn: ({date, idempotencyKey, ...body}: AddExtraRequest & {date: string; idempotencyKey: string}) =>
      call(
        client.POST('/v1/client/nutrition-days/{date}/extras', {
          params: {path: {date}, header: {'Idempotency-Key': idempotencyKey}},
          body,
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useLogPlannedOptionMutation() {
  const invalidate = useInvalidateNutritionDays();
  return useMutation({
    mutationFn: ({date, idempotencyKey, ...body}: LogPlannedOptionRequest & {date: string; idempotencyKey: string}) =>
      call(
        client.POST('/v1/client/nutrition-days/{date}/planned-options', {
          params: {path: {date}, header: {'Idempotency-Key': idempotencyKey}},
          body,
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useLogPlannedDayMutation() {
  const invalidate = useInvalidateNutritionDays();
  return useMutation({
    mutationFn: ({date, idempotencyKey}: {date: string; idempotencyKey: string}) =>
      call(
        client.POST('/v1/client/nutrition-days/{date}/planned-day', {
          params: {path: {date}, header: {'Idempotency-Key': idempotencyKey}},
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useReplaceItemMutation() {
  const invalidate = useInvalidateNutritionDays();
  return useMutation({
    mutationFn: ({date, idempotencyKey, ...body}: ReplacePlannedItemRequest & {date: string; idempotencyKey: string}) =>
      call(
        client.POST('/v1/client/nutrition-days/{date}/replacements', {
          params: {path: {date}, header: {'Idempotency-Key': idempotencyKey}},
          body,
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateDiaryEntryMutation() {
  const invalidate = useInvalidateNutritionDays();
  return useMutation({
    mutationFn: ({
      date,
      id,
      idempotencyKey,
      ...body
    }: UpdateDiaryEntryRequest & {date: string; id: string; idempotencyKey: string}) =>
      call(
        client.PATCH('/v1/client/nutrition-days/{date}/entries/{id}', {
          params: {path: {date, id}, header: {'Idempotency-Key': idempotencyKey}},
          body,
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useDeleteDiaryEntryMutation() {
  const invalidate = useInvalidateNutritionDays();
  return useMutation({
    mutationFn: ({
      date,
      id,
      idempotencyKey,
      ...body
    }: DeleteDiaryEntryRequest & {date: string; id: string; idempotencyKey: string}) =>
      call(
        client.DELETE('/v1/client/nutrition-days/{date}/entries/{id}', {
          params: {path: {date, id}, header: {'Idempotency-Key': idempotencyKey}},
          body,
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useSwitchNutritionMealOptionMutation() {
  const invalidate = useInvalidateNutritionDays();
  return useMutation({
    mutationFn: ({date, idempotencyKey, ...body}: SwitchOptionRequest & {date: string; idempotencyKey: string}) =>
      call(
        client.POST('/v1/client/nutrition-days/{date}/active-option', {
          params: {path: {date}, header: {'Idempotency-Key': idempotencyKey}},
          body,
        }),
      ),
    onSuccess: invalidate,
    onError: (error) => {
      if (getApiErrorCode(error) === 'stale_revision') {
        invalidate();
      }
    },
  });
}
