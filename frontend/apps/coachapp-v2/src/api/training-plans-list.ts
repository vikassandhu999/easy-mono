/**
 * Hand-written infinite query for `GET /v1/coach/training-plans`, plus every
 * other training-plan-list-shaped read and the plan-level CRUD mutations that
 * aren't part of the builder's optimistic protocol: create, update, assign,
 * duplicate, delete, and the two client-scoped lists (a client's assigned
 * plans, a client's training sessions).
 *
 * The plan DETAIL query (`getTrainingPlan`) and everything the builder writes
 * straight through to it live in `src/api/training-plan-builder.ts` instead —
 * this file's mutations invalidate list caches normally rather than patching
 * that single cache entry, since none of them run inside the builder's
 * patch-then-request flow.
 */
import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {clientKeys, trainingPlanKeys, trainingSessionKeys} from '@/api/keys';
import type {components, paths} from '@/api/schema';
import {workbenchMutationTargets} from '@/api/workbench-targets';

const PAGE_SIZE = 20;

export type TrainingPlanListResponse = components['schemas']['TrainingPlanListResponse'];
export type TrainingPlanCreateRequest = components['schemas']['TrainingPlanCreateRequest'];
export type TrainingPlanUpdateRequest = components['schemas']['TrainingPlanUpdateRequest'];
export type TrainingPlanRevisionRequest = components['schemas']['TrainingPlanRevisionRequest'];
export type TrainingPlanAssignRequest = components['schemas']['TrainingPlanAssignRequest'];
export type ClientTrainingPlanListResponse = components['schemas']['ClientTrainingPlanListResponse'];
export type TrainingSession = components['schemas']['TrainingSession'];
export type TrainingPerformedSet = components['schemas']['TrainingPerformedSet'];
export type TrainingSessionListResponse = components['schemas']['TrainingSessionListResponse'];

type TrainingPlanResponse = components['schemas']['TrainingPlanResponse'];
type TrainingSessionResponse = components['schemas']['TrainingSessionResponse'];

type ListTrainingPlansQuery = NonNullable<paths['/v1/coach/training-plans']['get']['parameters']['query']>;
type ListCoachClientTrainingPlansQuery = NonNullable<
  paths['/v1/coach/clients/{client_id}/training-plans']['get']['parameters']['query']
>;
type ListCoachClientTrainingSessionsQuery = NonNullable<
  paths['/v1/coach/clients/{client_id}/training-sessions']['get']['parameters']['query']
>;

/** Filter params — offset/limit are handled by the infinite query machinery. */
export type CoachTrainingPlansFilters = Pick<ListTrainingPlansQuery, 'archived'> & {search?: string};

export type ListTrainingPlansApiArg = Pick<ListTrainingPlansQuery, 'archived' | 'limit' | 'offset' | 'search'>;

export function useCoachTrainingPlansInfiniteQuery(filters?: CoachTrainingPlansFilters, options?: {enabled?: boolean}) {
  return useInfiniteQuery({
    queryKey: trainingPlanKeys.infinite(filters),
    enabled: options?.enabled ?? true,
    queryFn: ({pageParam}) =>
      call(
        client.GET('/v1/coach/training-plans', {
          params: {
            query: {
              ...(filters?.search ? {search: filters.search} : {}),
              ...(filters?.archived !== undefined ? {archived: filters.archived} : {}),
              offset: pageParam,
              limit: PAGE_SIZE,
            },
          },
        }),
      ) as Promise<TrainingPlanListResponse>,
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const nextOffset = lastPageParam + PAGE_SIZE;
      return nextOffset < lastPage.count ? nextOffset : undefined;
    },
  });
}

export function useListTrainingPlansQuery(params?: ListTrainingPlansApiArg, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: trainingPlanKeys.list(params),
    queryFn: () =>
      call(
        client.GET('/v1/coach/training-plans', {params: {query: params ?? undefined}}),
      ) as Promise<TrainingPlanListResponse>,
    enabled: options?.enabled ?? true,
  });
}

export function useListCoachClientTrainingPlansQuery(
  clientId: string,
  params?: ListCoachClientTrainingPlansQuery,
  options?: {enabled?: boolean},
) {
  return useQuery({
    queryKey: trainingPlanKeys.forClient(clientId),
    queryFn: () =>
      call(
        client.GET('/v1/coach/clients/{client_id}/training-plans', {
          params: {path: {client_id: clientId}, query: params ?? undefined},
        }),
      ) as Promise<ClientTrainingPlanListResponse>,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateTrainingPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TrainingPlanCreateRequest) =>
      call(client.POST('/v1/coach/training-plans', {body})) as Promise<TrainingPlanResponse>,
    onSuccess: () => {
      qc.invalidateQueries({queryKey: trainingPlanKeys.lists()});
    },
  });
}

export function useUpdateTrainingPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, body}: {id: string; body: TrainingPlanUpdateRequest}) =>
      call(
        client.PATCH('/v1/coach/training-plans/{id}', {params: {path: {id}}, body}),
      ) as Promise<TrainingPlanResponse>,
    onSuccess: (_data, {id}) => {
      // The mutation owns every cache effect (see the nutrition twin for the
      // full rationale): the plan's own entries, client plan-name columns,
      // and Programming membership. It doesn't know which client shows this
      // plan, so client and workbench caches are invalidated by prefix.
      qc.invalidateQueries({queryKey: trainingPlanKeys.detail(id)});
      qc.invalidateQueries({queryKey: trainingPlanKeys.lists()});
      qc.invalidateQueries({queryKey: trainingPlanKeys.forClients()});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
      qc.invalidateQueries({queryKey: clientKeys.details()});
      for (const queryKey of workbenchMutationTargets().afterMembershipChange) {
        qc.invalidateQueries({queryKey: [...queryKey]});
      }
    },
  });
}

export function useDeleteTrainingPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, expectedRevision}: {id: string; expectedRevision: number}) =>
      call(
        client.DELETE('/v1/coach/training-plans/{id}', {
          params: {path: {id}, query: {expected_revision: expectedRevision}},
        }),
      ),
    onSuccess: (_data, {id}) => {
      qc.removeQueries({queryKey: trainingPlanKeys.detail(id)});
      qc.invalidateQueries({queryKey: trainingPlanKeys.lists()});
      qc.invalidateQueries({queryKey: trainingPlanKeys.forClients()});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
      qc.invalidateQueries({queryKey: clientKeys.details()});
      for (const queryKey of workbenchMutationTargets().afterMembershipChange) {
        qc.invalidateQueries({queryKey: [...queryKey]});
      }
    },
  });
}

export function useArchiveTrainingPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, body}: {id: string; body: TrainingPlanRevisionRequest}) =>
      call(
        client.POST('/v1/coach/training-plans/{id}/archive', {params: {path: {id}}, body}),
      ) as Promise<TrainingPlanResponse>,
    onSuccess: (_data, {id}) => {
      qc.invalidateQueries({queryKey: trainingPlanKeys.detail(id)});
      qc.invalidateQueries({queryKey: trainingPlanKeys.lists()});
      qc.invalidateQueries({queryKey: trainingPlanKeys.forClients()});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
      qc.invalidateQueries({queryKey: clientKeys.details()});
      for (const queryKey of workbenchMutationTargets().afterMembershipChange) {
        qc.invalidateQueries({queryKey: [...queryKey]});
      }
    },
  });
}

export function useRestoreTrainingPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, body}: {id: string; body: TrainingPlanRevisionRequest}) =>
      call(
        client.POST('/v1/coach/training-plans/{id}/restore', {params: {path: {id}}, body}),
      ) as Promise<TrainingPlanResponse>,
    onSuccess: (_data, {id}) => {
      qc.invalidateQueries({queryKey: trainingPlanKeys.detail(id)});
      qc.invalidateQueries({queryKey: trainingPlanKeys.lists()});
      qc.invalidateQueries({queryKey: trainingPlanKeys.forClients()});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
      qc.invalidateQueries({queryKey: clientKeys.details()});
      for (const queryKey of workbenchMutationTargets().afterMembershipChange) {
        qc.invalidateQueries({queryKey: [...queryKey]});
      }
    },
  });
}

export function useDuplicateTrainingPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      call(
        client.POST('/v1/coach/training-plans/{id}/duplicate', {params: {path: {id}}}),
      ) as Promise<TrainingPlanResponse>,
    onSuccess: () => {
      qc.invalidateQueries({queryKey: trainingPlanKeys.lists()});
    },
  });
}

/**
 * Copies a template to a client. Unlike `updateTrainingPlan`, the request
 * names the exact client — so, unlike above, only that client's list needs
 * invalidating rather than every client's.
 */
export function useAssignTrainingPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({clientId, id, body}: {clientId: string; id: string; body: TrainingPlanAssignRequest}) =>
      call(
        client.POST('/v1/coach/clients/{client_id}/training-plans/{id}/assign', {
          params: {path: {client_id: clientId, id}},
          body,
        }),
      ) as Promise<TrainingPlanResponse>,
    onSuccess: (_data, {clientId}) => {
      qc.invalidateQueries({queryKey: trainingPlanKeys.forClient(clientId)});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
      // Assignment changes Programming membership and can auto-advance
      // `stage` on the open client screen.
      qc.invalidateQueries({queryKey: clientKeys.detail(clientId)});
      for (const queryKey of workbenchMutationTargets().afterMembershipChange) {
        qc.invalidateQueries({queryKey: [...queryKey]});
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Client training sessions (logged workouts, not templates)
// ---------------------------------------------------------------------------

/** A date-window session list can exceed one 20-row page; offset-paginated. */
export function useCoachClientTrainingSessionsInfiniteQuery(
  clientId: string,
  filters?: Omit<ListCoachClientTrainingSessionsQuery, 'limit' | 'offset'>,
) {
  return useInfiniteQuery({
    queryKey: trainingSessionKeys.forClientInfinite(clientId, filters),
    queryFn: ({pageParam}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/training-sessions', {
          params: {path: {client_id: clientId}, query: {...filters, limit: PAGE_SIZE, offset: pageParam}},
        }),
      ) as Promise<TrainingSessionListResponse>,
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const nextOffset = lastPageParam + PAGE_SIZE;
      return nextOffset < lastPage.count ? nextOffset : undefined;
    },
  });
}

export function useListCoachClientTrainingSessionsQuery(
  clientId: string,
  filters?: ListCoachClientTrainingSessionsQuery,
  options?: {enabled?: boolean},
) {
  return useQuery({
    queryKey: trainingSessionKeys.forClient(clientId, filters),
    queryFn: () =>
      call(
        client.GET('/v1/coach/clients/{client_id}/training-sessions', {
          params: {path: {client_id: clientId}, query: filters ?? undefined},
        }),
      ) as Promise<TrainingSessionListResponse>,
    enabled: options?.enabled ?? true,
  });
}

export function useGetCoachClientTrainingSessionQuery(clientId: string, id: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: trainingSessionKeys.detail(clientId, id),
    queryFn: () =>
      call(
        client.GET('/v1/coach/clients/{client_id}/training-sessions/{id}', {
          params: {path: {client_id: clientId, id}},
        }),
      ) as Promise<TrainingSessionResponse>,
    enabled: options?.enabled ?? true,
  });
}
