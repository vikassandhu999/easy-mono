/**
 * The nutrition builder's data layer — the ONLY module that names the builder's
 * cache entry or writes to it. Everything above works in plan-shaped values and
 * never imports `queryClient` or a query key directly (mirrors
 * `training-plan-builder.ts`).
 *
 * One entry, one key: `nutritionPlanKeys.detail(planId)`. `getNutritionPlan`
 * returns the whole tree: the plan-level meals (with items and server-computed
 * nutrition), the days with their ordered slot options, and the Mon..Sun
 * weekday assignments.
 *
 * This file also owns every mutation the builder writes through directly:
 * days, the weekday schedule, slot options, meals and meal items. All of them
 * are invalidation-free by design — the builder patches
 * `nutritionPlanKeys.detail(planId)` itself before the request lands and
 * reconciles with a refetch (positions and nutrition snapshots are
 * server-computed), so invalidating here too would just cause a redundant
 * refetch that could clobber an in-flight optimistic edit or a still-debouncing
 * amount write. Plan-level CRUD that ISN'T part of that optimistic protocol —
 * create/update/assign/duplicate/delete/list — lives in
 * `src/api/nutrition-plans-list.ts` instead, since it invalidates normally.
 */

import {useMutation, useQuery} from '@tanstack/react-query';
import {useCallback} from 'react';

import {call, client} from '@/api/client';
import {nutritionPlanKeys} from '@/api/keys';
import {patchQueryData, queryClient} from '@/api/query-client';
import type {components} from '@/api/schema';

export type NutritionPlan = components['schemas']['NutritionPlan'];
export type NutritionMeal = components['schemas']['NutritionMeal'];
export type NutritionMealItem = components['schemas']['NutritionMealItem'];
export type NutritionPlanDay = components['schemas']['NutritionPlanDay'];
export type NutritionDayMeal = components['schemas']['NutritionDayMeal'];
export type NutritionScheduleRequest = components['schemas']['NutritionScheduleRequest'];
export type NutritionDayMealCreateRequest = components['schemas']['NutritionDayMealCreateRequest'];
export type NutritionMealItemRequest = components['schemas']['NutritionMealItemRequest'];

type NutritionPlanResponse = {data: NutritionPlan};
type NutritionMealItemsCreateRequest = components['schemas']['NutritionMealItemsCreateRequest'];
type NutritionMealRequest = components['schemas']['NutritionMealRequest'];
type NutritionPlanDayCreateRequest = components['schemas']['NutritionPlanDayCreateRequest'];
type NutritionPlanDayUpdateRequest = components['schemas']['NutritionPlanDayUpdateRequest'];
type NutritionSlotOptionMoveRequest = components['schemas']['NutritionSlotOptionMoveRequest'];

/**
 * General-purpose fetch for one nutrition plan.
 *
 * MUST key on `nutritionPlanKeys.detail(id)` — every optimistic patch in this
 * file targets that exact key, so a different key here would silently split
 * the cache in two.
 */
export function useGetNutritionPlanQuery(id: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: nutritionPlanKeys.detail(id),
    queryFn: () => call(client.GET('/v1/coach/nutrition-plans/{id}', {params: {path: {id}}})),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Applies `recipe` to the cached plan and returns a token whose `.undo()`
 * reverses exactly that patch.
 */
export function usePlanPatcher(planId: string) {
  return useCallback(
    (recipe: (plan: NutritionPlan) => void) =>
      patchQueryData<NutritionPlanResponse>(nutritionPlanKeys.detail(planId), (draft) => {
        recipe(draft.data);
      }),
    [planId],
  );
}

/**
 * Throws away local state and re-reads the plan from the server.
 *
 * Two jobs: the reconciling refetch after a successful structural write
 * (positions and nutrition snapshots are server-computed), and the recovery
 * path for a failed coalesced amount write — undoing one patch out of a chain
 * would leave the cache describing a state neither side believes in. (These
 * mutations are invalidation-free by design, so this can't go through
 * `invalidateQueries` — it has to force a real refetch.)
 */
export function usePlanRefetch(planId: string) {
  return useCallback(() => {
    queryClient.refetchQueries({queryKey: nutritionPlanKeys.detail(planId)}).catch(() => undefined);
  }, [planId]);
}

// ---------------------------------------------------------------------------
// Weekly schedule
// ---------------------------------------------------------------------------

/** Full Mon..Sun map — the server replaces the plan's whole schedule with it. */
export function useUpdateNutritionPlanScheduleMutation() {
  return useMutation({
    mutationFn: ({body, planId}: {body: NutritionScheduleRequest; planId: string}) =>
      call(
        client.PUT('/v1/coach/nutrition-plans/{plan_id}/schedule', {
          params: {path: {plan_id: planId}},
          body,
        }),
      ),
  });
}

// ---------------------------------------------------------------------------
// Days
// ---------------------------------------------------------------------------

export function useCreateNutritionPlanDayMutation() {
  return useMutation({
    mutationFn: ({body, planId}: {body: NutritionPlanDayCreateRequest; planId: string}) =>
      call(client.POST('/v1/coach/nutrition-plans/{plan_id}/days', {params: {path: {plan_id: planId}}, body})),
  });
}

export function useUpdateNutritionPlanDayMutation() {
  return useMutation({
    mutationFn: ({body, id}: {body: NutritionPlanDayUpdateRequest; id: string}) =>
      call(client.PATCH('/v1/coach/nutrition-days/{id}', {params: {path: {id}}, body})),
  });
}

export function useDeleteNutritionPlanDayMutation() {
  return useMutation({
    mutationFn: (id: string) => call(client.DELETE('/v1/coach/nutrition-days/{id}', {params: {path: {id}}})),
  });
}

// ---------------------------------------------------------------------------
// Slot options (day meals)
// ---------------------------------------------------------------------------

/**
 * One endpoint for both "place this plan meal here" (`nutrition_meal_id`) and
 * "create a meal and place it" (`name`) — exactly one of the two. The response
 * embeds the full meal, so the builder can push it into `plan.meals`.
 */
export function useAddDayMealMutation() {
  return useMutation({
    mutationFn: ({body, dayId}: {body: NutritionDayMealCreateRequest; dayId: string}) =>
      call(client.POST('/v1/coach/nutrition-days/{day_id}/meals', {params: {path: {day_id: dayId}}, body})),
  });
}

export function useMoveNutritionSlotOptionMutation() {
  return useMutation({
    mutationFn: ({body, id}: {body: NutritionSlotOptionMoveRequest; id: string}) =>
      call(client.PATCH('/v1/coach/nutrition-day-meals/{id}', {params: {path: {id}}, body})),
  });
}

export function useRemoveNutritionSlotOptionMutation() {
  return useMutation({
    mutationFn: (id: string) => call(client.DELETE('/v1/coach/nutrition-day-meals/{id}', {params: {path: {id}}})),
  });
}

// ---------------------------------------------------------------------------
// Meals and meal items
// ---------------------------------------------------------------------------

export function useUpdateMealMutation() {
  return useMutation({
    mutationFn: ({body, id}: {body: NutritionMealRequest; id: string}) =>
      call(client.PATCH('/v1/coach/nutrition-meals/{id}', {params: {path: {id}}, body})),
  });
}

export function useDeleteMealMutation() {
  return useMutation({
    mutationFn: (id: string) => call(client.DELETE('/v1/coach/nutrition-meals/{id}', {params: {path: {id}}})),
  });
}

/** Batch create — one transaction, items land in the order given. */
export function useCreateMealItemsMutation() {
  return useMutation({
    mutationFn: ({body, mealId}: {body: NutritionMealItemsCreateRequest; mealId: string}) =>
      call(client.POST('/v1/coach/nutrition-meals/{meal_id}/items', {params: {path: {meal_id: mealId}}, body})),
  });
}

export function useUpdateMealItemMutation() {
  return useMutation({
    mutationFn: ({body, id}: {body: NutritionMealItemRequest; id: string}) =>
      call(client.PATCH('/v1/coach/nutrition-meal-items/{id}', {params: {path: {id}}, body})),
  });
}

export function useDeleteMealItemMutation() {
  return useMutation({
    mutationFn: (id: string) => call(client.DELETE('/v1/coach/nutrition-meal-items/{id}', {params: {path: {id}}})),
  });
}
