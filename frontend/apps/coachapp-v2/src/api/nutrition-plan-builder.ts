/**
 * The nutrition builder's data layer — the ONLY module that names the builder's
 * cache entry or touches it. Everything above works in plan-shaped values and
 * never imports `queryClient` or a query key directly (mirrors
 * `training-plan-builder.ts`).
 *
 * One entry, one key: `nutritionPlanKeys.detail(planId)`. `getNutritionPlan`
 * returns the whole tree: the plan-level meals (with items and server-computed
 * nutrients), the days with their ordered slot options, and the Mon..Sun
 * weekday assignments.
 *
 * The read is a React Query hook; Menu writes are plain functions. Every
 * Meal / Menu Item save sends the whole authoritative Menu through one
 * revisioned operation, and the command layer serializes those saves and
 * reconciles the complete response into this same cache entry.
 *
 * Plan-level CRUD that ISN'T part of the Menu replacement —
 * create/update/assign/duplicate/delete/list — lives in
 * `src/api/nutrition-plans-list.ts` instead, since it invalidates normally.
 */

import {useQuery} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {nutritionDayKeys, nutritionPlanKeys} from '@/api/keys';
import {planToMenuRequest} from '@/api/nutrition-menu';
import {patchQueryData, queryClient} from '@/api/query-client';
import type {components} from '@/api/schema';

export type NutritionPlan = components['schemas']['NutritionPlan'];
export type NutritionDayPattern = components['schemas']['NutritionDayPattern'];
export type NutritionWeekSchedule = components['schemas']['NutritionWeekSchedule'];
export type NutritionScheduleRequest = NutritionWeekSchedule;
export type NutritionMeal = components['schemas']['NutritionMeal'];
export type NutritionMealItem = components['schemas']['NutritionMealItem'];
export type NutritionPortion = components['schemas']['NutritionPortion'];
export type NutritionMealItemInput = components['schemas']['NutritionMealItemInput'];
export type NutritionPortionInput = components['schemas']['NutritionPortionInput'];

/** Slot placement returns with the Day Pattern ticket. Local stand-ins keep the empty builder compiling. */
export type NutritionDayMeal = {
  id: string;
  meal_slot: string;
  nutrition_meal_id: string;
  position: number;
};

export type NutritionPlanDay = NutritionDayPattern & {day_meals: NutritionDayMeal[]};

export type NutritionDayMealCreateRequest = {
  meal_slot: string;
  name?: string;
  nutrition_meal_id?: string;
};

type NutritionPlanResponse = components['schemas']['NutritionPlanResponse'];
type NutritionPlanDayUpdateRequest = {name: string};
type NutritionSlotOptionMoveRequest = {meal_slot?: string; position?: number};

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

export async function refetchNutritionPlan(planId: string): Promise<NutritionPlan | undefined> {
  await queryClient.refetchQueries({queryKey: nutritionPlanKeys.detail(planId), type: 'active'});
  return readPlan(planId);
}

/**
 * Throws away local state and re-reads the plan from the server.
 *
 * Two jobs: the reconciling refetch after a successful structural write
 * (positions and nutrient snapshots are server-computed), and the recovery
 * path for a failed coalesced write — undoing one patch out of a chain would
 * leave the cache describing a state neither side believes in. (Builder
 * writes are invalidation-free, so this can't go through `invalidateQueries`
 * — it has to force a real refetch.)
 */
export function refetchPlan(planId: string) {
  queryClient.refetchQueries({queryKey: nutritionPlanKeys.detail(planId)}).catch(() => undefined);
  queryClient.invalidateQueries({queryKey: nutritionDayKeys.all}).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Complete Menu replacement
// ---------------------------------------------------------------------------

export async function replaceMenu(planId: string, plan: NutritionPlan): Promise<NutritionPlan> {
  const response = (await call(
    client.PUT('/v1/coach/nutrition-plans/{id}/menu', {
      params: {path: {id: planId}},
      body: planToMenuRequest(plan),
    }),
  )) as NutritionPlanResponse;
  return response.data;
}

// ---------------------------------------------------------------------------
// Day Pattern / slot placement — later Programming ticket
// ---------------------------------------------------------------------------

const scheduleUnavailable = () => Promise.reject(new Error('Day Pattern editing returns in a later ticket'));

export async function replaceSchedule(_planId: string, _body: NutritionScheduleRequest) {
  await scheduleUnavailable();
}

export async function createDay(_planId: string): Promise<NutritionPlanDay> {
  await scheduleUnavailable();
  throw new Error('unreachable');
}

export async function updateDay(_id: string, _body: NutritionPlanDayUpdateRequest): Promise<NutritionPlanDay> {
  await scheduleUnavailable();
  throw new Error('unreachable');
}

export async function deleteDay(_id: string): Promise<void> {
  await scheduleUnavailable();
}

export async function addDayMeal(_dayId: string, _body: NutritionDayMealCreateRequest): Promise<NutritionDayMeal> {
  await scheduleUnavailable();
  throw new Error('unreachable');
}

export async function moveSlotOption(_id: string, _body: NutritionSlotOptionMoveRequest): Promise<NutritionDayMeal> {
  await scheduleUnavailable();
  throw new Error('unreachable');
}

export async function removeSlotOption(_id: string): Promise<void> {
  await scheduleUnavailable();
}
