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
import {nutritionDayKeys, nutritionPlanKeys} from '@/api/keys';
import {patchQueryData, queryClient} from '@/api/query-client';
import type {components} from '@/api/schema';

export type NutritionPlan = components['schemas']['NutritionPlan'];
export type NutritionDayPattern = components['schemas']['NutritionDayPattern'];
export type NutritionWeekSchedule = components['schemas']['NutritionWeekSchedule'];
export type NutritionScheduleRequest = NutritionWeekSchedule;

/** Menu types return with later Programming tickets. Local stand-ins keep the empty builder compiling. */
export type NutritionDayMeal = {
  id: string;
  meal_slot: string;
  nutrition_meal_id: string;
  position: number;
};

export type NutritionPlanDay = NutritionDayPattern & {day_meals: NutritionDayMeal[]};

export type NutritionSnapshot = {
  calories?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  protein_g?: number | null;
};

export type NutritionMealItem = {
  amount?: number | null;
  food_id?: string | null;
  id: string;
  inserted_at?: string;
  name?: string | null;
  nutrition?: NutritionSnapshot;
  position?: number;
  recipe_id?: string | null;
  unit?: string | null;
  updated_at?: string;
  weight_g?: number | null;
};

export type NutritionMeal = {
  id: string;
  meal_items: NutritionMealItem[];
  name: string;
  notes?: string | null;
  nutrition?: NutritionSnapshot;
};

export type NutritionDayMealCreateRequest = {
  meal_slot: string;
  name?: string;
  nutrition_meal_id?: string;
};

export type NutritionMealItemRequest = {
  amount?: number | null;
  food_id?: string | null;
  recipe_id?: string | null;
  unit?: string | null;
  weight_g?: number | null;
};

type NutritionPlanResponse = {data: NutritionPlan};
type NutritionMealItemsCreateRequest = {items: NutritionMealItemRequest[]};
type NutritionMealRequest = {name?: string; notes?: string | null};
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
  queryClient.invalidateQueries({queryKey: nutritionDayKeys.all}).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Requests — thin, unwrapped, no cache effects
// ---------------------------------------------------------------------------

const menuUnavailable = () => Promise.reject(new Error('Menu editing returns in a later ticket'));

export async function replaceSchedule(_planId: string, _body: NutritionScheduleRequest) {
  await menuUnavailable();
}

export async function createDay(_planId: string): Promise<NutritionPlanDay> {
  await menuUnavailable();
  throw new Error('unreachable');
}

export async function updateDay(_id: string, _body: NutritionPlanDayUpdateRequest): Promise<NutritionPlanDay> {
  await menuUnavailable();
  throw new Error('unreachable');
}

export async function deleteDay(_id: string): Promise<void> {
  await menuUnavailable();
}

export async function addDayMeal(_dayId: string, _body: NutritionDayMealCreateRequest): Promise<NutritionDayMeal> {
  await menuUnavailable();
  throw new Error('unreachable');
}

export async function moveSlotOption(_id: string, _body: NutritionSlotOptionMoveRequest): Promise<NutritionDayMeal> {
  await menuUnavailable();
  throw new Error('unreachable');
}

export async function removeSlotOption(_id: string): Promise<void> {
  await menuUnavailable();
}

export async function updateMeal(_id: string, _body: NutritionMealRequest): Promise<void> {
  await menuUnavailable();
}

export async function deleteMeal(_id: string): Promise<void> {
  await menuUnavailable();
}

export async function createMealItems(_mealId: string, _body: NutritionMealItemsCreateRequest): Promise<void> {
  await menuUnavailable();
}

export async function updateMealItem(_id: string, _body: NutritionMealItemRequest): Promise<void> {
  await menuUnavailable();
}

export async function deleteMealItem(_id: string): Promise<void> {
  await menuUnavailable();
}
