/**
 * Client training. `schedule` is the plan's Mon..Sun map of weekday -> workout id,
 * where a null weekday is a rest day; sessions have state active/completed/discarded
 * with performed_sets vs planned_snapshot.
 */
import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {exerciseKeys, sessionKeys, trainingPlanKeys} from '@/api/keys';
import type {components, paths} from '@/api/schema';
import {clientTrainingCoverageRequest} from '@/api/training-coverage';

export type ClientTrainingPlan = components['schemas']['ClientTrainingPlan'];
export type ClientTrainingCoverage = components['schemas']['ClientTrainingCoverage'];
export type ClientTrainingCoverageResponse = components['schemas']['ClientTrainingCoverageResponse'];
export type TrainingPerformedSet = components['schemas']['TrainingPerformedSet'];
export type TrainingPlanWorkout = components['schemas']['TrainingPlanWorkout'];
export type TrainingSession = components['schemas']['TrainingSession'];
type TrainingSessionRequest = components['schemas']['TrainingSessionRequest'];
type TrainingSessionUpdateRequest = components['schemas']['TrainingSessionUpdateRequest'];
type TrainingPerformedSetRequest = components['schemas']['TrainingPerformedSetRequest'];

type PlanListQuery = paths['/v1/client/training-plans']['get']['parameters']['query'];
type SessionListQuery = paths['/v1/client/training-sessions']['get']['parameters']['query'];
type ExerciseListQuery = paths['/v1/client/training-exercises']['get']['parameters']['query'];

type PlanListResponse = components['schemas']['ClientTrainingPlanListResponse'];
type SessionListResponse = components['schemas']['TrainingSessionListResponse'];
type SessionResponse = components['schemas']['TrainingSessionResponse'];
type ExerciseListResponse = components['schemas']['TrainingExerciseListResponse'];

// ── Plans ────────────────────────────────────────────────────

export function useListClientTrainingPlansQuery(query: PlanListQuery = {}) {
  return useQuery({
    queryKey: trainingPlanKeys.list(query),
    queryFn: () => call(client.GET('/v1/client/training-plans', {params: {query}})) as Promise<PlanListResponse>,
  });
}

export function useResolveClientTrainingCoverageQuery(date?: string) {
  return useQuery({
    queryKey: trainingPlanKeys.coverage(date),
    queryFn: () =>
      call(
        client.GET('/v1/client/training-plans/coverage', clientTrainingCoverageRequest(date)),
      ) as Promise<ClientTrainingCoverageResponse>,
  });
}

// ── Sessions ─────────────────────────────────────────────────

export function useListClientTrainingSessionsQuery(query: SessionListQuery = {}) {
  return useQuery({
    queryKey: sessionKeys.list(query),
    queryFn: () => call(client.GET('/v1/client/training-sessions', {params: {query}})) as Promise<SessionListResponse>,
  });
}

const SESSION_PAGE_SIZE = 20;

/** Full history, offset-paginated 20 at a time (the server caps limit at 20). */
export function useClientTrainingSessionsInfiniteQuery() {
  return useInfiniteQuery({
    queryKey: sessionKeys.infinite(),
    queryFn: ({pageParam}) =>
      call(
        client.GET('/v1/client/training-sessions', {
          params: {query: {limit: SESSION_PAGE_SIZE, offset: pageParam}},
        }),
      ) as Promise<SessionListResponse>,
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const nextOffset = lastPageParam + SESSION_PAGE_SIZE;
      return nextOffset < lastPage.count ? nextOffset : undefined;
    },
  });
}

export function useGetClientTrainingSessionQuery(id: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: () =>
      call(client.GET('/v1/client/training-sessions/{id}', {params: {path: {id}}})) as Promise<SessionResponse>,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateClientTrainingSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TrainingSessionRequest) =>
      call(client.POST('/v1/client/training-sessions', {body})) as Promise<SessionResponse>,
    onSuccess: () => {
      qc.invalidateQueries({queryKey: sessionKeys.lists()});
    },
  });
}

export function useUpdateClientTrainingSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, ...body}: TrainingSessionUpdateRequest & {id: string}) =>
      call(client.PATCH('/v1/client/training-sessions/{id}', {params: {path: {id}}, body})) as Promise<SessionResponse>,
    onSuccess: (_data, {id}) => {
      qc.invalidateQueries({queryKey: sessionKeys.detail(id)});
      qc.invalidateQueries({queryKey: sessionKeys.lists()});
    },
  });
}

// ── Performed sets ───────────────────────────────────────────

export function useCreateClientPerformedSetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({sessionId, ...body}: TrainingPerformedSetRequest & {sessionId: string}) =>
      call(
        client.POST('/v1/client/training-sessions/{session_id}/performed-sets', {
          params: {path: {session_id: sessionId}},
          body,
        }),
      ),
    // lists() too: the session INDEX payload embeds performed_sets, so the
    // set counts/volume on Training, History and Today read the list cache.
    onSuccess: (_data, {sessionId}) => {
      qc.invalidateQueries({queryKey: sessionKeys.detail(sessionId)});
      qc.invalidateQueries({queryKey: sessionKeys.lists()});
    },
  });
}

/**
 * The set paths only need the set id, but the cache effect is on the session —
 * callers pass `sessionId` so the mutation owns its own invalidation.
 * `onSuccess` returns the detail invalidation, so `mutateAsync` resolves only
 * after the session refetch settles (the active screen used to `await
 * refetch()` by hand for this); the list refresh doesn't need to block.
 */
export function useUpdateClientPerformedSetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, sessionId: _sessionId, ...body}: TrainingPerformedSetRequest & {id: string; sessionId: string}) =>
      call(client.PATCH('/v1/client/training-performed-sets/{id}', {params: {path: {id}}, body})),
    onSuccess: (_data, {sessionId}) => {
      qc.invalidateQueries({queryKey: sessionKeys.lists()});
      return qc.invalidateQueries({queryKey: sessionKeys.detail(sessionId)});
    },
  });
}

export function useDeleteClientPerformedSetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id}: {id: string; sessionId: string}) =>
      call(client.DELETE('/v1/client/training-performed-sets/{id}', {params: {path: {id}}})),
    onSuccess: (_data, {sessionId}) => {
      qc.invalidateQueries({queryKey: sessionKeys.lists()});
      return qc.invalidateQueries({queryKey: sessionKeys.detail(sessionId)});
    },
  });
}

// ── Exercise library (read-only, for swap / add) ─────────────

export function useListClientExercisesQuery(query: ExerciseListQuery = {}) {
  return useQuery({
    queryKey: exerciseKeys.list(query),
    queryFn: () =>
      call(client.GET('/v1/client/training-exercises', {params: {query}})) as Promise<ExerciseListResponse>,
  });
}
