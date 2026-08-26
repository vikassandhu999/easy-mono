import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {call, client} from './client.ts';
import {clientKeys, trainingPlanKeys, trainingSessionKeys} from './keys.ts';
import {patchQueryData, queryClient} from './query-client.ts';
import type {
  PerformedSet as PerformedSetSchema,
  paths,
  Revision,
  Session as SessionSchema,
  TrainingPlanAssign,
  TrainingPlanCreate,
  TrainingPlanPlannedSet as TrainingPlanPlannedSetSchema,
  TrainingPlan as TrainingPlanSchema,
  TrainingPlanUpdate,
  TrainingPlanWorkoutExercise as TrainingPlanWorkoutExerciseSchema,
  TrainingPlanWorkout as TrainingPlanWorkoutSchema,
  TrainingSchedule as TrainingScheduleSchema,
} from './schema.ts';
import {omitUndefined} from './shared.ts';
import {trainingPlanAssignmentRequest, trainingPlanPeriodRequest} from './training-plan-lifecycle.ts';
import {coachClientTrainingSessionHistoryRequest, planToPrescriptionRequest} from './training-sessions.ts';
import {workbenchMutationTargets} from './workbench-targets.ts';

// --- training-plans-list ---

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

const PAGE_SIZE = 20;

export type TrainingPlanListResponse =
  paths['/v1/coach/training-plans']['get']['responses'][200]['content']['application/json'];
export type TrainingPlanCreateRequest = TrainingPlanCreate;
export type TrainingPlanUpdateRequest = TrainingPlanUpdate;
export type TrainingPlanRevisionRequest = Revision;
export type TrainingPlanAssignRequest = TrainingPlanAssign;
export type ClientTrainingPlan = TrainingPlanSchema;
export type ClientTrainingPlanListResponse =
  paths['/v1/coach/clients/{client_id}/training-plans']['get']['responses'][200]['content']['application/json'];
export type TrainingSession = SessionSchema;
export type TrainingPerformedSet = PerformedSetSchema;
export type TrainingSessionListResponse =
  paths['/v1/coach/clients/{client_id}/training-sessions']['get']['responses'][200]['content']['application/json'];

type ListTrainingPlansQuery = NonNullable<paths['/v1/coach/training-plans']['get']['parameters']['query']>;
type ListCoachClientTrainingPlansQuery = NonNullable<
  paths['/v1/coach/clients/{client_id}/training-plans']['get']['parameters']['query']
>;
type CoachClientTrainingPlansFilters = Pick<ListCoachClientTrainingPlansQuery, 'status'>;
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
      ),
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
    queryFn: () => call(client.GET('/v1/coach/training-plans', params ? {params: {query: omitUndefined(params)}} : {})),
    enabled: options?.enabled ?? true,
  });
}

export function useListCoachClientTrainingPlansQuery(
  clientId: string,
  params?: ListCoachClientTrainingPlansQuery,
  options?: {enabled?: boolean},
) {
  return useQuery({
    queryKey: trainingPlanKeys.forClient(clientId, params),
    queryFn: () =>
      call(
        client.GET(
          '/v1/coach/clients/{client_id}/training-plans',
          params
            ? {params: {path: {client_id: clientId}, query: omitUndefined(params)}}
            : {params: {path: {client_id: clientId}}},
        ),
      ),
    enabled: options?.enabled ?? true,
  });
}

export function useCoachClientTrainingPlansInfiniteQuery(
  clientId: string,
  filters?: CoachClientTrainingPlansFilters,
  options?: {enabled?: boolean},
) {
  return useInfiniteQuery({
    queryKey: trainingPlanKeys.forClientInfinite(clientId, filters),
    enabled: options?.enabled ?? true,
    queryFn: ({pageParam}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/training-plans', {
          params: {
            path: {client_id: clientId},
            query: {...omitUndefined(filters ?? {}), limit: PAGE_SIZE, offset: pageParam},
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

export function useCreateTrainingPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TrainingPlanCreateRequest) => call(client.POST('/v1/coach/training-plans', {body})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: trainingPlanKeys.lists()});
    },
  });
}

export function useUpdateTrainingPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, body}: {id: string; body: TrainingPlanUpdateRequest}) =>
      call(client.PATCH('/v1/coach/training-plans/{id}', {params: {path: {id}}, body})),
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
      call(client.POST('/v1/coach/training-plans/{id}/archive', {params: {path: {id}}, body})),
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
      call(client.POST('/v1/coach/training-plans/{id}/restore', {params: {path: {id}}, body})),
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
    mutationFn: (id: string) => call(client.POST('/v1/coach/training-plans/{id}/duplicate', {params: {path: {id}}})),
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
        client.POST(
          '/v1/coach/clients/{client_id}/training-plans/{id}/assign',
          trainingPlanAssignmentRequest({body, clientId, id}),
        ),
      ),
    onSuccess: (_data, {clientId}) => {
      qc.invalidateQueries({queryKey: trainingPlanKeys.forClientLists(clientId)});
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
  filters?: Pick<ListCoachClientTrainingSessionsQuery, 'from' | 'to'>,
) {
  return useInfiniteQuery({
    queryKey: trainingSessionKeys.forClientInfinite(clientId, filters),
    queryFn: ({pageParam}) =>
      call(
        client.GET(
          '/v1/coach/clients/{client_id}/training-sessions',
          coachClientTrainingSessionHistoryRequest(clientId, {...filters, limit: PAGE_SIZE, offset: pageParam}),
        ),
      ),
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
        client.GET(
          '/v1/coach/clients/{client_id}/training-sessions',
          coachClientTrainingSessionHistoryRequest(clientId, filters),
        ),
      ),
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
      ),
    enabled: options?.enabled ?? true,
  });
}

// --- training-plan-builder ---

/**
 * The training builder's data layer — the ONLY module that names the builder's
 * cache entry or touches it. Everything above works in plan-shaped values and
 * never imports `queryClient` or a query key directly.
 *
 * One entry, one key: `trainingPlanKeys.detail(planId)`. `getTrainingPlan`
 * returns the whole tree — workouts, their elements, each element's exercise
 * (with `tracking_type`), the planned sets, and the weekday schedule as one
 * Mon..Sun map — server-ordered, so the builder needs no second query and
 * there is no second key to get wrong.
 *
 * The read is a React Query hook; writes are plain functions. Every structural
 * save sends the whole authoritative Prescription through one revisioned
 * operation, and the command layer serializes those saves and reconciles the
 * complete response into this same cache entry.
 *
 * Plan-level CRUD that is not part of Prescription replacement —
 * create/update/assign/duplicate/delete/list — lives in
 * `src/api/training-plans-list.ts` instead, since it invalidates normally.
 * `updatePlanPeriod` is the one hybrid: the builder edits an assigned plan's
 * dates optimistically, but list rows show them, so it re-runs the same
 * invalidations `useUpdateTrainingPlanMutation` would.
 */

export type TrainingPlan = TrainingPlanSchema;
export type TrainingPlanWorkout = TrainingPlanWorkoutSchema;
export type TrainingPlanWorkoutExercise = TrainingPlanWorkoutExerciseSchema;
export type TrainingSchedule = TrainingScheduleSchema;
export type TrainingPlanPlannedSet = TrainingPlanPlannedSetSchema;

type TrainingPlanResponse =
  paths['/v1/coach/training-plans/{id}']['get']['responses'][200]['content']['application/json'];

/**
 * General-purpose fetch for one training plan.
 *
 * MUST key on `trainingPlanKeys.detail(id)` — every optimistic patch in this
 * file targets that exact key, so a different key here would silently split
 * the cache in two.
 */
export function useGetTrainingPlanQuery(planId: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: trainingPlanKeys.detail(planId),
    queryFn: () => call(client.GET('/v1/coach/training-plans/{id}', {params: {path: {id: planId}}})),
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
export function patchPlan(planId: string, recipe: (plan: TrainingPlan) => void) {
  return patchQueryData<TrainingPlanResponse>(trainingPlanKeys.detail(planId), (draft) => {
    recipe(draft.data);
  });
}

/**
 * The plan as it is cached RIGHT NOW — not as a component last rendered it.
 * Commands build payloads from this so two quick edits compose instead of the
 * second one being computed off a stale prop.
 */
export function readPlan(planId: string): TrainingPlan | undefined {
  return queryClient.getQueryData<TrainingPlanResponse>(trainingPlanKeys.detail(planId))?.data;
}

export async function refetchTrainingPlan(planId: string): Promise<TrainingPlan | undefined> {
  await queryClient.refetchQueries({queryKey: trainingPlanKeys.detail(planId), type: 'active'});
  return readPlan(planId);
}

// ---------------------------------------------------------------------------
// Complete Prescription replacement
// ---------------------------------------------------------------------------

export async function replacePrescription(planId: string, plan: TrainingPlan): Promise<TrainingPlan> {
  const response = await call(
    client.PUT('/v1/coach/training-plans/{id}/prescription', {
      params: {path: {id: planId}},
      body: planToPrescriptionRequest(plan),
    }),
  );
  return response.data;
}

/**
 * The one builder write with cache effects beyond the detail entry: assigned
 * plans' dates show on list rows and client cards, so this mirrors
 * `useUpdateTrainingPlanMutation`'s invalidations (detail included — the
 * refetch confirms the optimistic patch, same as the screens' flow).
 */
export async function updatePlanPeriod(
  planId: string,
  body: Pick<TrainingPlanUpdateRequest, 'end_date' | 'start_date'>,
): Promise<TrainingPlan> {
  const plan = readPlan(planId);
  if (!plan) {
    throw new Error('Cannot update Client Plan Coverage before the plan is loaded');
  }

  const response = await call(
    client.PATCH('/v1/coach/training-plans/{id}', {
      params: {path: {id: planId}},
      body: trainingPlanPeriodRequest(plan, body),
    }),
  );
  queryClient.invalidateQueries({queryKey: trainingPlanKeys.detail(planId)});
  queryClient.invalidateQueries({queryKey: trainingPlanKeys.lists()});
  queryClient.invalidateQueries({queryKey: trainingPlanKeys.forClients()});
  queryClient.invalidateQueries({queryKey: clientKeys.lists()});
  queryClient.invalidateQueries({queryKey: clientKeys.details()});
  for (const queryKey of workbenchMutationTargets().afterMembershipChange) {
    queryClient.invalidateQueries({queryKey: [...queryKey]});
  }
  return response.data;
}
