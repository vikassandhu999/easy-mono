/**
 * The nutrition builder's data layer — the ONLY module that names the builder's
 * cache entry or touches it. Everything above works in plan-shaped values and
 * never imports `queryClient` or a query key directly (mirrors
 * `training-plan-builder.ts`).
 *
 * One entry, one key: `nutritionPlanKeys.detail(planId)`. `getNutritionPlan`
 * returns the whole tree: the plan-level meals (with items and server-computed
 * nutrition), the days with their ordered slot options, and the Mon..Sun
 * weekday assignments.
 *
 * The read is a React Query hook; everything else here is a PLAIN FUNCTION.
 * The builder's writes are optimistic and invalidation-free by design — the
 * command layer patches the cache itself and reconciles with a refetch, since
 * positions and nutrition snapshots are server-computed (see
 * `builder/commands.ts`) — so `useMutation` would contribute nothing here:
 * its `onSuccess` invalidation is deliberately unused, retry is off app-wide,
 * `isPending` is tracked by the two commands that surface it, and its
 * per-render result objects are exactly the footgun RM-142 exists for.
 * (`patchPlan`/`readPlan`/`refetchPlan` are plain for the same reason —
 * `queryClient` is a module singleton, and wrapping module state in hooks
 * only manufactures identities.)
 *
 * Plan-level CRUD that ISN'T part of the optimistic protocol —
 * create/update/assign/duplicate/delete/list — lives in
 * `src/api/nutrition-plans-list.ts` instead, since it invalidates normally.
 */

import {useQuery} from '@tanstack/react-query';

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

// ---------------------------------------------------------------------------
// The cached plan
// ---------------------------------------------------------------------------

/**
 * Applies `recipe` to the cached plan and returns a token whose `.undo()`
 * reverses exactly that patch.
 */
export function patchPlan(planId: string, recipe: (plan: NutritionPlan) => void) {
  return patchQueryData<NutritionPlanResponse>(nutritionPlanKeys.detail(planId), (draft) => {
    recipe(draft.data);
  });
}

/**
 * The plan as it is cached RIGHT NOW — not as a component last rendered it.
 * Commands build payloads from this so two quick edits compose instead of the
 * second one being computed off a stale prop.
 */
export function readPlan(planId: string): NutritionPlan | undefined {
  return queryClient.getQueryData<NutritionPlanResponse>(nutritionPlanKeys.detail(planId))?.data;
}

/**
 * Throws away local state and re-reads the plan from the server.
 *
 * Two jobs: the reconciling refetch after a successful structural write
 * (positions and nutrition snapshots are server-computed), and the recovery
 * path for a failed coalesced write — undoing one patch out of a chain would
 * leave the cache describing a state neither side believes in. (Builder
 * writes are invalidation-free, so this can't go through `invalidateQueries`
 * — it has to force a real refetch.)
 */
export function refetchPlan(planId: string) {
  queryClient.refetchQueries({queryKey: nutritionPlanKeys.detail(planId)}).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Requests — thin, unwrapped, no cache effects
// ---------------------------------------------------------------------------

/** Full Mon..Sun map — the server replaces the plan's whole schedule with it. */
export async function replaceSchedule(planId: string, body: NutritionScheduleRequest) {
  await call(client.PUT('/v1/coach/nutrition-plans/{plan_id}/schedule', {params: {path: {plan_id: planId}}, body}));
}

export async function createDay(planId: string): Promise<NutritionPlanDay> {
  const response = await call(
    client.POST('/v1/coach/nutrition-plans/{plan_id}/days', {params: {path: {plan_id: planId}}, body: {}}),
  );
  return response.data;
}

export async function updateDay(id: string, body: NutritionPlanDayUpdateRequest): Promise<NutritionPlanDay> {
  const response = await call(client.PATCH('/v1/coach/nutrition-days/{id}', {params: {path: {id}}, body}));
  return response.data;
}

export async function deleteDay(id: string): Promise<void> {
  await call(client.DELETE('/v1/coach/nutrition-days/{id}', {params: {path: {id}}}));
}

/**
 * One endpoint for both "place this plan meal here" (`nutrition_meal_id`) and
 * "create a meal and place it" (`name`) — exactly one of the two. The response
 * embeds the full meal, so the builder can push it into `plan.meals`.
 */
export async function addDayMeal(dayId: string, body: NutritionDayMealCreateRequest) {
  const response = await call(
    client.POST('/v1/coach/nutrition-days/{day_id}/meals', {params: {path: {day_id: dayId}}, body}),
  );
  return response.data;
}

export async function moveSlotOption(id: string, body: NutritionSlotOptionMoveRequest) {
  const response = await call(client.PATCH('/v1/coach/nutrition-day-meals/{id}', {params: {path: {id}}, body}));
  return response.data;
}

export async function removeSlotOption(id: string): Promise<void> {
  await call(client.DELETE('/v1/coach/nutrition-day-meals/{id}', {params: {path: {id}}}));
}

export async function updateMeal(id: string, body: NutritionMealRequest): Promise<void> {
  await call(client.PATCH('/v1/coach/nutrition-meals/{id}', {params: {path: {id}}, body}));
}

export async function deleteMeal(id: string): Promise<void> {
  await call(client.DELETE('/v1/coach/nutrition-meals/{id}', {params: {path: {id}}}));
}

/** Batch create — one transaction, items land in the order given. */
export async function createMealItems(mealId: string, body: NutritionMealItemsCreateRequest): Promise<void> {
  await call(client.POST('/v1/coach/nutrition-meals/{meal_id}/items', {params: {path: {meal_id: mealId}}, body}));
}

export async function updateMealItem(id: string, body: NutritionMealItemRequest): Promise<void> {
  await call(client.PATCH('/v1/coach/nutrition-meal-items/{id}', {params: {path: {id}}, body}));
}

export async function deleteMealItem(id: string): Promise<void> {
  await call(client.DELETE('/v1/coach/nutrition-meal-items/{id}', {params: {path: {id}}}));
}
