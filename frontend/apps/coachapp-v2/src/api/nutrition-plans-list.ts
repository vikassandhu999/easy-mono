/**
 * Nutrition plans: the flat/infinite plan lists, plan-level CRUD and the
 * client meal logs. All of it invalidates normally.
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
import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {clientKeys, mealLogKeys, nutritionPlanKeys} from '@/api/keys';
import type {components, paths} from '@/api/schema';

const PAGE_SIZE = 20;

export type NutritionPlan = components['schemas']['NutritionPlan'];
export type NutritionPlanRequest = components['schemas']['NutritionPlanRequest'];
export type MealLog = components['schemas']['MealLog'];

type NutritionPlanListResponse = components['schemas']['NutritionPlanListResponse'];
type NutritionPlanAssignRequest = components['schemas']['NutritionPlanAssignRequest'];

type ListNutritionPlansQuery = NonNullable<paths['/v1/coach/nutrition-plans']['get']['parameters']['query']>;
type ListCoachClientNutritionPlansQuery = NonNullable<
  paths['/v1/coach/clients/{client_id}/nutrition-plans']['get']['parameters']['query']
>;
type ListCoachMealLogsQuery = NonNullable<
  paths['/v1/coach/clients/{client_id}/nutrition-meal-logs']['get']['parameters']['query']
>;

/** Filter params — offset/limit are handled by the infinite query machinery. */
export type CoachNutritionPlansFilters = Pick<ListNutritionPlansQuery, 'search' | 'status'>;

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
              ...(filters?.search && {search: filters.search}),
              ...(filters?.status && {status: filters.status}),
              offset: pageParam,
              limit: PAGE_SIZE,
            },
          },
        }),
      ) as Promise<NutritionPlanListResponse>,
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const nextOffset = lastPageParam + PAGE_SIZE;
      return nextOffset < lastPage.count ? nextOffset : undefined;
    },
  });
}

export type ListNutritionPlansParams = Pick<ListNutritionPlansQuery, 'limit' | 'offset' | 'search' | 'status'>;

export function useListNutritionPlansQuery(params?: ListNutritionPlansParams, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: nutritionPlanKeys.list(params),
    queryFn: () =>
      call(
        client.GET('/v1/coach/nutrition-plans', {params: {query: params ?? undefined}}),
      ) as Promise<NutritionPlanListResponse>,
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
        client.GET('/v1/coach/clients/{client_id}/nutrition-plans', {
          params: {path: {client_id: clientId}, query: params ?? undefined},
        }),
      ) as Promise<NutritionPlanListResponse>,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateNutritionPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NutritionPlanRequest) => call(client.POST('/v1/coach/nutrition-plans', {body})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: nutritionPlanKeys.lists()});
    },
  });
}

/**
 * The mutation owns every cache effect of a plan update — call sites never
 * invalidate. Screens that patch `detail(id)` optimistically (builder/edit)
 * keep doing so for instant UI; the invalidation here reconciles them.
 * Client keys are included because a plan update can flip client-visible
 * fields: archiving flips `needs_plan` (chips on the list, attention tab and
 * the open client detail), and a rename changes the plan-name columns on
 * client rows. The mutation doesn't know which client shows this plan, so
 * details are invalidated by prefix.
 */
export function useUpdateNutritionPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({body, id}: {body: NutritionPlanRequest; id: string}) =>
      call(client.PATCH('/v1/coach/nutrition-plans/{id}', {params: {path: {id}}, body})),
    onSuccess: (_data, {id}) => {
      qc.invalidateQueries({queryKey: nutritionPlanKeys.detail(id)});
      qc.invalidateQueries({queryKey: nutritionPlanKeys.lists()});
      qc.invalidateQueries({queryKey: nutritionPlanKeys.forClients()});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
      qc.invalidateQueries({queryKey: clientKeys.details()});
    },
  });
}

export function useDeleteNutritionPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call(client.DELETE('/v1/coach/nutrition-plans/{id}', {params: {path: {id}}})),
    onSuccess: (_data, id) => {
      qc.removeQueries({queryKey: nutritionPlanKeys.detail(id)});
      qc.invalidateQueries({queryKey: nutritionPlanKeys.lists()});
      qc.invalidateQueries({queryKey: nutritionPlanKeys.forClients()});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
      qc.invalidateQueries({queryKey: clientKeys.details()});
    },
  });
}

export function useDuplicateNutritionPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call(client.POST('/v1/coach/nutrition-plans/{id}/duplicate', {params: {path: {id}}})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: nutritionPlanKeys.lists()});
    },
  });
}

/**
 * Invalidates that client's plan list, the client lists (stat strip's "needs
 * plan" flag) and the client detail — assignment flips the server-derived
 * `needs_plan` chip and can auto-advance `stage` on the open client screen.
 */
export function useAssignNutritionPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({body, id}: {body: NutritionPlanAssignRequest; id: string}) =>
      call(client.POST('/v1/coach/nutrition-plans/{id}/assign', {params: {path: {id}}, body})),
    onSuccess: (_data, {body}) => {
      qc.invalidateQueries({queryKey: nutritionPlanKeys.forClient(body.client_id)});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
      qc.invalidateQueries({queryKey: clientKeys.detail(body.client_id)});
    },
  });
}

// ---------------------------------------------------------------------------
// Client meal logs (nutrition tab / stat strip).
// ---------------------------------------------------------------------------

export type ListCoachMealLogsParams = Pick<ListCoachMealLogsQuery, 'date' | 'from' | 'to'>;

export function useListCoachMealLogsQuery(
  clientId: string,
  params?: ListCoachMealLogsParams,
  options?: {enabled?: boolean},
) {
  return useQuery({
    queryKey: mealLogKeys.forClient(clientId, params),
    queryFn: () =>
      call(
        client.GET('/v1/coach/clients/{client_id}/nutrition-meal-logs', {
          params: {path: {client_id: clientId}, query: params ?? undefined},
        }),
      ),
    enabled: options?.enabled ?? true,
  });
}
