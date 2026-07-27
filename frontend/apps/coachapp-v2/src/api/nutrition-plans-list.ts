/**
 * Nutrition plans: the flat/infinite plan lists plus every hook the plan
 * builder (`src/nutrition-plans/plan-builder/*`) and the plan CRUD screens use.
 *
 * The infinite list is hand-written because codegen can't emit
 * `build.infiniteQuery` (mirrors `nutrition-foods.ts`: offset pagination, page
 * size 20). Everything else here used to be generated `tag: false` endpoints;
 * `git show HEAD:.../nutrition-plans-list.ts` wired the ones below via
 * `coachApi.enhanceEndpoints` — ported 1:1 as `invalidateQueries` calls.
 *
 * The day/meal/option/item builder mutations were genuinely tag:false in the
 * old app (no enhanceEndpoints entry) — the builder patches its own cached
 * `getNutritionPlan` entry optimistically (see `nutritionPlanKeys.detail(id)`
 * usage below) and calls `refetch()` itself, so those mutations stay
 * invalidation-free here too.
 */
import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {clientKeys, mealLogKeys, nutritionPlanKeys} from '@/api/keys';
import type {components, paths} from '@/api/schema';

const PAGE_SIZE = 20;

export type NutritionPlan = components['schemas']['NutritionPlan'];
export type NutritionPlanRequest = components['schemas']['NutritionPlanRequest'];
export type NutritionMeal = components['schemas']['NutritionMeal'];
export type NutritionMealItem = components['schemas']['NutritionMealItem'];
export type NutritionPlanDay = components['schemas']['NutritionPlanDay'];
export type NutritionDayMeal = components['schemas']['NutritionDayMeal'];
export type MealLog = components['schemas']['MealLog'];

type NutritionPlanListResponse = components['schemas']['NutritionPlanListResponse'];
type NutritionMealItemRequest = components['schemas']['NutritionMealItemRequest'];
type NutritionMealRequest = components['schemas']['NutritionMealRequest'];
type NutritionPlanAssignRequest = components['schemas']['NutritionPlanAssignRequest'];
type NutritionPlanDayCreateRequest = components['schemas']['NutritionPlanDayCreateRequest'];
type NutritionPlanDayUpdateRequest = components['schemas']['NutritionPlanDayUpdateRequest'];
type NutritionSlotOptionCreateRequest = components['schemas']['NutritionSlotOptionCreateRequest'];
type NutritionWeekdayAssignRequest = components['schemas']['NutritionWeekdayAssignRequest'];

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

/**
 * The builder patches this exact cache entry optimistically via
 * `patchQueryData(nutritionPlanKeys.detail(id), …)` — do not change this key.
 */
export function useGetNutritionPlanQuery(id: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: nutritionPlanKeys.detail(id),
    queryFn: () => call(client.GET('/v1/coach/nutrition-plans/{id}', {params: {path: {id}}})),
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
 * tag:false in the old app — the builder/detail screens keep the cached
 * `getNutritionPlan` entry fresh themselves via `patchQueryData`. Invalidate
 * the plan LIST (flat + infinite share the `lists()` prefix) plus every
 * client's plan list, since the client detail card edits macro targets
 * through this mutation too.
 */
export function useUpdateNutritionPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({body, id}: {body: NutritionPlanRequest; id: string}) =>
      call(client.PATCH('/v1/coach/nutrition-plans/{id}', {params: {path: {id}}, body})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: nutritionPlanKeys.lists()});
      qc.invalidateQueries({queryKey: [...nutritionPlanKeys.all, 'for-client']});
    },
  });
}

export function useDeleteNutritionPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call(client.DELETE('/v1/coach/nutrition-plans/{id}', {params: {path: {id}}})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: nutritionPlanKeys.lists()});
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

/** Invalidates that client's plan list + the client list (stat strip's "needs plan" flag). */
export function useAssignNutritionPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({body, id}: {body: NutritionPlanAssignRequest; id: string}) =>
      call(client.POST('/v1/coach/nutrition-plans/{id}/assign', {params: {path: {id}}, body})),
    onSuccess: (_data, {body}) => {
      qc.invalidateQueries({queryKey: nutritionPlanKeys.forClient(body.client_id)});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
    },
  });
}

// ---------------------------------------------------------------------------
// Plan builder — days, weekday assignments, meals, slot options, meal items.
// tag:false: the builder owns its own optimistic patch of
// nutritionPlanKeys.detail(planId) plus a reconciling refetch(), so none of
// these invalidate anything.
// ---------------------------------------------------------------------------

export function useAssignNutritionPlanWeekdayMutation() {
  return useMutation({
    mutationFn: ({body, planId}: {body: NutritionWeekdayAssignRequest; planId: string}) =>
      call(
        client.PUT('/v1/coach/nutrition-plans/{plan_id}/weekday-assignments', {
          params: {path: {plan_id: planId}},
          body,
        }),
      ),
  });
}

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

export function useAddNutritionSlotOptionMutation() {
  return useMutation({
    mutationFn: ({body, dayId}: {body: NutritionSlotOptionCreateRequest; dayId: string}) =>
      call(client.POST('/v1/coach/nutrition-days/{day_id}/options', {params: {path: {day_id: dayId}}, body})),
  });
}

export function useRemoveNutritionSlotOptionMutation() {
  return useMutation({
    mutationFn: (id: string) => call(client.DELETE('/v1/coach/nutrition-day-meals/{id}', {params: {path: {id}}})),
  });
}

export function useCreateMealMutation() {
  return useMutation({
    mutationFn: ({body, planId}: {body: NutritionMealRequest; planId: string}) =>
      call(client.POST('/v1/coach/nutrition-plans/{plan_id}/meals', {params: {path: {plan_id: planId}}, body})),
  });
}

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

export function useCreateMealItemMutation() {
  return useMutation({
    mutationFn: ({body, mealId}: {body: NutritionMealItemRequest; mealId: string}) =>
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
