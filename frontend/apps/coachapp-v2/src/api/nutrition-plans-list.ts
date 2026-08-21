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
import {type QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {clientKeys, nutritionDayKeys, nutritionPlanKeys} from '@/api/keys';
import {nutritionPlanAssignmentRequest} from '@/api/nutrition-plan-lifecycle';
import type {components, paths} from '@/api/schema';
import {workbenchMutationTargets} from '@/api/workbench-targets';

const PAGE_SIZE = 20;

export type NutritionPlan = components['schemas']['NutritionPlan'];
export type NutritionPlanCreateRequest = components['schemas']['NutritionPlanCreateRequest'];
export type NutritionPlanUpdateRequest = components['schemas']['NutritionPlanUpdateRequest'];
export type NutritionPlanRevisionRequest = components['schemas']['NutritionPlanRevisionRequest'];
export type NutritionPlanAssignRequest = components['schemas']['NutritionPlanAssignRequest'];
export type NutritionDay = components['schemas']['NutritionDay'];
export type NutritionDayRow = components['schemas']['NutritionDayRow'];
export type NutritionDaySlot = components['schemas']['NutritionDaySlot'];
export type MealSlot = NutritionDaySlot['meal_slot'];
export type NutritionDayOptionItem = components['schemas']['NutritionDayOptionItem'];

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
    queryFn: () => call(client.GET('/v1/coach/nutrition-plans', {params: {query: params ?? undefined}})),
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
        client.GET('/v1/coach/clients/{client_id}/nutrition-days', {
          params: {path: {client_id: clientId}, query: params ?? undefined},
        }),
      ),
    enabled: options?.enabled ?? true,
  });
}
