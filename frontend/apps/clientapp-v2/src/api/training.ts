/**
 * Client training. `schedule` is the plan's Mon..Sun map of weekday -> workout id,
 * where a null weekday is a rest day; sessions have state active/completed/discarded
 * with performed_sets vs planned_snapshot.
 */
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {exerciseKeys, sessionKeys, trainingPlanKeys} from '@/api/keys';
import type {components, paths} from '@/api/schema';

export type ClientTrainingPlan = components['schemas']['ClientTrainingPlan'];
export type TrainingExercise = components['schemas']['TrainingExercise'];
export type TrainingPerformedSet = components['schemas']['TrainingPerformedSet'];
export type TrainingPlanExercise = components['schemas']['TrainingPlanExercise'];
export type TrainingPlanPlannedSet = components['schemas']['TrainingPlanPlannedSet'];
export type TrainingPlanWorkout = components['schemas']['TrainingPlanWorkout'];
export type TrainingPlanWorkoutExercise = components['schemas']['TrainingPlanWorkoutExercise'];
export type TrainingSession = components['schemas']['TrainingSession'];
export type TrainingSessionRequest = components['schemas']['TrainingSessionRequest'];
export type TrainingSessionUpdateRequest = components['schemas']['TrainingSessionUpdateRequest'];
export type TrainingPerformedSetRequest = components['schemas']['TrainingPerformedSetRequest'];

type PlanListQuery = paths['/v1/client/training-plans']['get']['parameters']['query'];
type SessionListQuery = paths['/v1/client/training-sessions']['get']['parameters']['query'];
type ExerciseListQuery = paths['/v1/client/training-exercises']['get']['parameters']['query'];

type PlanListResponse = components['schemas']['ClientTrainingPlanListResponse'];
type PlanResponse = components['schemas']['ClientTrainingPlanResponse'];
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

export function useGetClientTrainingPlanQuery(id: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: trainingPlanKeys.detail(id),
    queryFn: () => call(client.GET('/v1/client/training-plans/{id}', {params: {path: {id}}})) as Promise<PlanResponse>,
    enabled: options?.enabled ?? true,
  });
}

// ── Sessions ─────────────────────────────────────────────────

export function useListClientTrainingSessionsQuery(query: SessionListQuery = {}) {
  return useQuery({
    queryKey: sessionKeys.list(query),
    queryFn: () => call(client.GET('/v1/client/training-sessions', {params: {query}})) as Promise<SessionListResponse>,
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
    // create carries sessionId, so it refreshes the active session query directly.
    // update/delete only carry the set id — the active screen refetches the
    // session after those instead.
    onSuccess: (_data, {sessionId}) => {
      qc.invalidateQueries({queryKey: sessionKeys.detail(sessionId)});
    },
  });
}

export function useUpdateClientPerformedSetMutation() {
  return useMutation({
    mutationFn: ({id, ...body}: TrainingPerformedSetRequest & {id: string}) =>
      call(client.PATCH('/v1/client/training-performed-sets/{id}', {params: {path: {id}}, body})),
  });
}

export function useDeleteClientPerformedSetMutation() {
  return useMutation({
    mutationFn: (id: string) => call(client.DELETE('/v1/client/training-performed-sets/{id}', {params: {path: {id}}})),
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
