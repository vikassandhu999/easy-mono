import {type QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {call, client} from './client.ts';
import {clientKeys, nutritionDayKeys, nutritionPlanKeys} from './keys.ts';
import {planToMenuRequest} from './nutrition-menu.ts';
import {nutritionPlanAssignmentRequest, nutritionPlanPeriodRequest} from './nutrition-plan-lifecycle.ts';
import {patchQueryData, queryClient} from './query-client.ts';
import type {
  Day,
  NutritionDayOptionItem as NutritionDayOptionItemSchema,
  NutritionDayPattern as NutritionDayPatternSchema,
  NutritionDayPatternSlot as NutritionDayPatternSlotSchema,
  NutritionDayRow as NutritionDayRowSchema,
  NutritionDaySlot as NutritionDaySlotSchema,
  NutritionMealItemInput as NutritionMealItemInputSchema,
  NutritionMealItem as NutritionMealItemSchema,
  NutritionMealOption as NutritionMealOptionSchema,
  NutritionMeal as NutritionMealSchema,
  NutritionPlanAssign,
  NutritionPlanCreate,
  NutritionPlan as NutritionPlanSchema,
  NutritionPlanUpdate,
  NutritionPortionInput as NutritionPortionInputSchema,
  NutritionPortion as NutritionPortionSchema,
  NutritionWeekScheduleInput,
  NutritionWeekSchedule as NutritionWeekScheduleSchema,
  paths,
  Revision,
} from './schema.ts';
import {omitUndefined} from './shared.ts';
import {workbenchMutationTargets} from './workbench-targets.ts';

export {pickedToItemRef, toItemInput} from '@easy/utils/nutrition-item-ref';
export {
  formatParsedPortion,
  parseNutritionPortion,
  portionWireFromInput,
  toPortionInput,
  toPortionWire,
} from '@easy/utils/nutrition-portion';

// --- nutrition-plans-list ---

/**
 * Nutrition plans: the flat/infinite plan lists, plan-level CRUD and the
 * client Nutrition Days. All of it invalidates normally.
 *
 * The plan DETAIL query (`getNutritionPlan`) and everything the builder writes
 * through optimistically — days, schedule, slot options, meals, meal items —
 * live in `src/api/nutrition-plan-builder.ts` instead, because those are
 * invalidation-free by design (the builder patches its own cache entry).
 *
 * The infinite list is hand-written because codegen can't emit
 * `build.infiniteQuery` (mirrors `nutrition-foods.ts`: offset pagination, page
 * size 20).
 */

const PAGE_SIZE = 20;

export type NutritionPlan = NutritionPlanSchema;
export type NutritionPlanCreateRequest = NutritionPlanCreate;
export type NutritionPlanUpdateRequest = NutritionPlanUpdate;
export type NutritionPlanRevisionRequest = Revision;
export type NutritionPlanAssignRequest = NutritionPlanAssign;
export type NutritionDay = Day;
export type NutritionDayRow = NutritionDayRowSchema;
export type NutritionDaySlot = NutritionDaySlotSchema;
export type MealSlot = NutritionDaySlot['meal_slot'];
export type NutritionDayOptionItem = NutritionDayOptionItemSchema;

type ListNutritionPlansQuery = NonNullable<paths['/v1/coach/nutrition-plans']['get']['parameters']['query']>;
type ListCoachClientNutritionPlansQuery = NonNullable<
  paths['/v1/coach/clients/{client_id}/nutrition-plans']['get']['parameters']['query']
>;
type ListCoachNutritionDaysQuery = NonNullable<
  paths['/v1/coach/clients/{client_id}/nutrition-days']['get']['parameters']['query']
>;

/** Filter params — offset/limit are handled by the infinite query machinery. */
export type CoachNutritionPlansFilters = Pick<ListNutritionPlansQuery, 'archived'> & {search?: string};

export type ListNutritionPlansParams = Pick<ListNutritionPlansQuery, 'archived' | 'limit' | 'offset' | 'search'>;

export function useCoachNutritionPlansInfiniteQuery(
  filters?: CoachNutritionPlansFilters,
  options?: {enabled?: boolean},
) {
  return useInfiniteQuery({
    queryKey: nutritionPlanKeys.infinite(filters),
    enabled: options?.enabled ?? true,
    queryFn: ({pageParam}) =>
      call(
        client.GET('/v1/coach/nutrition-plans', {
          params: {
            query: {
              ...(filters?.search ? {search: filters.search} : {}),
              ...(filters?.archived !== undefined ? {archived: filters.archived} : {}),
              offset: pageParam,
              limit: PAGE_SIZE,
            },
          },
        }),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const nextOffset = lastPageParam + PAGE_SIZE;
      return nextOffset < lastPage.count ? nextOffset : undefined;
    },
  });
}

export function useListNutritionPlansQuery(params?: ListNutritionPlansParams, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: nutritionPlanKeys.list(params),
    queryFn: () =>
      call(client.GET('/v1/coach/nutrition-plans', params ? {params: {query: omitUndefined(params)}} : {})),
    enabled: options?.enabled ?? true,
  });
}

export type ListCoachClientNutritionPlansParams = Pick<
  ListCoachClientNutritionPlansQuery,
  'limit' | 'offset' | 'status'
>;

export function useListCoachClientNutritionPlansQuery(
  clientId: string,
  params?: ListCoachClientNutritionPlansParams,
  options?: {enabled?: boolean},
) {
  return useQuery({
    queryKey: nutritionPlanKeys.forClient(clientId),
    queryFn: () =>
      call(
        client.GET(
          '/v1/coach/clients/{client_id}/nutrition-plans',
          params
            ? {params: {path: {client_id: clientId}, query: omitUndefined(params)}}
            : {params: {path: {client_id: clientId}}},
        ),
      ),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateNutritionPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NutritionPlanCreateRequest) => call(client.POST('/v1/coach/nutrition-plans', {body})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: nutritionPlanKeys.lists()});
    },
  });
}

/**
 * Every cache a plan lifecycle change can touch — the mutation owns all of it,
 * call sites never invalidate. Screens that patch `detail(id)` optimistically
 * (builder/edit) keep doing so for instant UI; the invalidation here reconciles
 * them. Client keys are included because a plan rename changes the plan-name
 * columns on client rows. Workbench keys reconcile Programming membership when
 * coverage or status changes. When the mutation knows the assigned client, it
 * passes `clientId` to target that client; otherwise both client and workbench
 * caches are invalidated by prefix.
 */
export function invalidatePlanCaches(qc: QueryClient, {clientId, id}: {clientId?: string; id?: string} = {}) {
  if (id) {
    qc.invalidateQueries({queryKey: nutritionPlanKeys.detail(id)});
  }
  qc.invalidateQueries({queryKey: nutritionPlanKeys.lists()});
  qc.invalidateQueries({
    queryKey: clientId ? nutritionPlanKeys.forClient(clientId) : nutritionPlanKeys.forClients(),
  });
  qc.invalidateQueries({queryKey: nutritionDayKeys.all});
  qc.invalidateQueries({queryKey: clientKeys.lists()});
  qc.invalidateQueries({queryKey: clientId ? clientKeys.detail(clientId) : clientKeys.details()});
  for (const queryKey of workbenchMutationTargets().afterMembershipChange) {
    qc.invalidateQueries({queryKey: [...queryKey]});
  }
}

export function useUpdateNutritionPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({body, id}: {body: NutritionPlanUpdateRequest; id: string}) =>
      call(client.PATCH('/v1/coach/nutrition-plans/{id}', {params: {path: {id}}, body})),
    onSuccess: (_data, {id}) => invalidatePlanCaches(qc, {id}),
  });
}

export function useDeleteNutritionPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, expectedRevision}: {id: string; expectedRevision: number}) =>
      call(
        client.DELETE('/v1/coach/nutrition-plans/{id}', {
          params: {path: {id}, query: {expected_revision: expectedRevision}},
        }),
      ),
    onSuccess: (_data, {id}) => {
      qc.removeQueries({queryKey: nutritionPlanKeys.detail(id)});
      invalidatePlanCaches(qc);
    },
  });
}

export function useArchiveNutritionPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, body}: {id: string; body: NutritionPlanRevisionRequest}) =>
      call(client.POST('/v1/coach/nutrition-plans/{id}/archive', {params: {path: {id}}, body})),
    onSuccess: (_data, {id}) => invalidatePlanCaches(qc, {id}),
  });
}

export function useRestoreNutritionPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, body}: {id: string; body: NutritionPlanRevisionRequest}) =>
      call(client.POST('/v1/coach/nutrition-plans/{id}/restore', {params: {path: {id}}, body})),
    onSuccess: (_data, {id}) => invalidatePlanCaches(qc, {id}),
  });
}

export function useDuplicateNutritionPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, body}: {id: string; body: NutritionPlanRevisionRequest}) =>
      call(client.POST('/v1/coach/nutrition-plans/{id}/duplicate', {params: {path: {id}}, body})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: nutritionPlanKeys.lists()});
    },
  });
}

/**
 * Copies a Template to a client. The request names the exact client, so only
 * that client's list needs invalidating rather than every client's.
 */
export function useAssignNutritionPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({body, clientId, id}: {body: NutritionPlanAssignRequest; clientId: string; id: string}) =>
      call(
        client.POST(
          '/v1/coach/clients/{client_id}/nutrition-plans/{id}/assign',
          nutritionPlanAssignmentRequest({body, clientId, id}),
        ),
      ),
    onSuccess: (_data, {clientId, id}) => invalidatePlanCaches(qc, {clientId, id}),
  });
}

export type ListCoachNutritionDaysParams = Pick<
  ListCoachNutritionDaysQuery,
  'date' | 'from' | 'to' | 'offset' | 'limit'
>;

export function useListCoachNutritionDaysQuery(
  clientId: string,
  params?: ListCoachNutritionDaysParams,
  options?: {enabled?: boolean},
) {
  return useQuery({
    queryKey: nutritionDayKeys.forClient(clientId, params),
    queryFn: () =>
      call(
        client.GET(
          '/v1/coach/clients/{client_id}/nutrition-days',
          params
            ? {params: {path: {client_id: clientId}, query: omitUndefined(params)}}
            : {params: {path: {client_id: clientId}}},
        ),
      ),
    enabled: options?.enabled ?? true,
  });
}

// --- nutrition-plan-builder ---

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
 * Meal, Day Pattern, Meal Option, and Week Schedule save sends the whole
 * authoritative Menu through one revisioned operation, and the command layer
 * serializes those saves and reconciles the complete response into this same
 * cache entry.
 *
 * Plan-level CRUD that ISN'T part of the Menu replacement —
 * create/update/assign/duplicate/delete/list — lives in
 * `src/api/nutrition-plans-list.ts` instead, since it invalidates normally.
 */

export type NutritionDayPattern = NutritionDayPatternSchema;
export type NutritionDayPatternSlot = NutritionDayPatternSlotSchema;
export type NutritionMealOption = NutritionMealOptionSchema;
export type NutritionWeekSchedule = NutritionWeekScheduleSchema;
export type NutritionScheduleRequest = NutritionWeekScheduleInput;
export type NutritionMeal = NutritionMealSchema;
export type NutritionMealItem = NutritionMealItemSchema;
export type NutritionPortion = NutritionPortionSchema;
export type NutritionMealItemInput = NutritionMealItemInputSchema;
export type NutritionPortionInput = NutritionPortionInputSchema;

/** Parsed portion — impossible sibling-null states removed at the boundary. */
export type ParsedNutritionPortion =
  | {grams: number; kind: 'gram'}
  | {amount: number; kind: 'serving'; label: null | string; unit: string};

export type NutritionItemRef = {food_id: string; kind: 'food'} | {kind: 'recipe'; recipe_id: string};

type NutritionPlanResponse =
  paths['/v1/coach/nutrition-plans/{id}']['get']['responses'][200]['content']['application/json'];

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
  const response = await call(
    client.PUT('/v1/coach/nutrition-plans/{id}/menu', {
      params: {path: {id: planId}},
      body: planToMenuRequest(plan),
    }),
  );
  return response.data;
}

/**
 * The one builder write with cache effects beyond the detail entry: assigned
 * plans' dates show on list rows, client cards, and Workbench, so it shares
 * `invalidatePlanCaches` with the lifecycle mutations (detail included — the
 * refetch confirms the optimistic patch).
 */
export async function updatePlanPeriod(
  planId: string,
  body: Pick<NutritionPlanUpdateRequest, 'end_date' | 'start_date'>,
): Promise<NutritionPlan> {
  const plan = readPlan(planId);
  if (!plan) {
    throw new Error('Cannot update Client Plan Coverage before the plan is loaded');
  }

  const response = await call(
    client.PATCH('/v1/coach/nutrition-plans/{id}', {
      params: {path: {id: planId}},
      body: nutritionPlanPeriodRequest(plan, body),
    }),
  );
  invalidatePlanCaches(queryClient, {id: planId});
  return response.data;
}
