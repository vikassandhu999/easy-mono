import {onlineManager, useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {ApiError, call, callEmpty, client} from './client';
import {trainingKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {PerformedSetCreate, PerformedSetUpdate, Session, SessionListQuery, SessionUpdate} from './schema';
import {getSession} from './session';

export type {
  PerformedSet,
  PerformedSetCreate,
  PerformedSetUpdate,
  Session,
  SessionPlannedSet,
  SessionSnapshotExercise,
  TrainingPlan,
  TrainingPlanPlannedSet,
  TrainingPlanWorkout,
} from './schema';
export type SessionFilters = Pick<SessionListQuery, 'search' | 'state' | 'from' | 'to'>;
export type CreateSet = PerformedSetCreate & {request_id: string};

export function useTrainingCoverage() {
  return useQuery({
    queryKey: trainingKeys.coverage(),
    queryFn: ({signal}) => call(client.GET('/v1/client/training-plans/coverage', {signal})),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useTrainingPlans(search: string) {
  return useInfiniteQuery({
    queryKey: trainingKeys.plans(search),
    queryFn: ({pageParam, signal}) =>
      call(client.GET('/v1/client/training-plans', {params: {query: {search, cursor: pageParam, limit: 20}}, signal})),
    ...cursorPagination,
  });
}

export function useTrainingPlan(id: string) {
  return useQuery({
    queryKey: trainingKeys.plan(id),
    queryFn: ({signal}) => call(client.GET('/v1/client/training-plans/{id}', {params: {path: {id}}, signal})),
    staleTime: 0,
  });
}

export function useTrainingHistory(filters: SessionFilters) {
  return useInfiniteQuery({
    queryKey: trainingKeys.history(filters),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/client/training-sessions', {
          params: {query: {...filters, cursor: pageParam, limit: 20}},
          signal,
        }),
      ),
    ...cursorPagination,
  });
}

export function useActiveTraining() {
  return useQuery({
    queryKey: trainingKeys.active(),
    queryFn: ({signal}) => call(client.GET('/v1/client/training-sessions/active', {signal})),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useTrainingSession(id: string) {
  return useQuery({
    queryKey: trainingKeys.session(id),
    queryFn: ({signal}) => call(client.GET('/v1/client/training-sessions/{id}', {params: {path: {id}}, signal})),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

function requireOnline() {
  if (!onlineManager.isOnline()) {
    throw new Error('Reconnect before saving. Your draft is kept on this device.');
  }
}

function requireOwner(owner: string | undefined) {
  if (!owner || getSession()?.id !== owner) {
    throw new Error('Your session changed. Please sign in again.');
  }
}

async function trainingChanged(owner: string | undefined, session?: Session) {
  requireOwner(owner);
  if (session) {
    queryClient.setQueryData(trainingKeys.session(session.id), {data: session});
  }
  await queryClient.invalidateQueries({queryKey: trainingKeys.all});
  requireOwner(owner);
}

export function useStartTraining() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async (workoutId: string | null) => {
      const owner = getSession()?.id;
      requireOnline();
      const active = await call(client.GET('/v1/client/training-sessions/active'));
      requireOwner(owner);
      if (active.data) {
        return active;
      }
      try {
        return await call(client.POST('/v1/client/training-sessions', {body: {training_workout_id: workoutId}}));
      } catch (error) {
        if (!(error instanceof ApiError) || error.status >= 500 || error.status === 409) {
          const recovered = await call(client.GET('/v1/client/training-sessions/active'));
          if (recovered.data) {
            return recovered;
          }
        }
        throw error;
      }
    },
    onSuccess: (result, _input, owner) => trainingChanged(owner, result.data ?? undefined),
  });
}

type SetWrite =
  | {kind: 'create'; body: CreateSet}
  | {kind: 'update'; id: string; body: PerformedSetUpdate}
  | {kind: 'remove'; id: string};

export function useWriteTrainingSet(sessionId: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async (input: SetWrite) => {
      const owner = getSession()?.id;
      requireOnline();
      if (input.kind === 'create') {
        return call(
          client.POST('/v1/client/training-sessions/{session_id}/performed-sets', {
            params: {path: {session_id: sessionId}},
            body: input.body,
          }),
        );
      }
      if (input.kind === 'update') {
        return call(
          client.PATCH('/v1/client/training-performed-sets/{id}', {
            params: {path: {id: input.id}},
            body: input.body,
          }),
        );
      }
      try {
        await callEmpty(client.DELETE('/v1/client/training-performed-sets/{id}', {params: {path: {id: input.id}}}));
      } catch (error) {
        if (!(error instanceof ApiError) || error.status >= 500 || error.status === 404) {
          const saved = await call(client.GET('/v1/client/training-sessions/{id}', {params: {path: {id: sessionId}}}));
          requireOwner(owner);
          if (!saved.data.performed_sets.some((set) => set.id === input.id)) {
            return null;
          }
        }
        throw error;
      }
      return null;
    },
    onSuccess: (result, input, owner) => {
      requireOwner(owner);
      queryClient.setQueryData<{data: Session}>(trainingKeys.session(sessionId), (cached) => {
        if (!cached) {
          return cached;
        }
        const sets =
          input.kind === 'remove'
            ? cached.data.performed_sets.filter((set) => set.id !== input.id)
            : result
              ? [...cached.data.performed_sets.filter((set) => set.id !== result.data.id), result.data].sort(
                  (left, right) => left.position - right.position,
                )
              : cached.data.performed_sets;
        return {data: {...cached.data, performed_sets: sets}};
      });
      return trainingChanged(owner);
    },
    onError: async (_error, _input, owner) => {
      if (owner && getSession()?.id === owner) {
        await queryClient.invalidateQueries({queryKey: trainingKeys.session(sessionId)});
      }
    },
  });
}

export function useSaveTraining(sessionId: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async (input: {kind: 'save' | 'complete'; body: SessionUpdate} | {kind: 'discard'}) => {
      requireOnline();
      const params = {path: {id: sessionId}};
      if (input.kind === 'discard') {
        return call(client.POST('/v1/client/training-sessions/{id}/discard', {params}));
      }
      return input.kind === 'complete'
        ? call(client.POST('/v1/client/training-sessions/{id}/complete', {params, body: input.body}))
        : call(client.PATCH('/v1/client/training-sessions/{id}', {params, body: input.body}));
    },
    onSuccess: (result, _input, owner) => trainingChanged(owner, result.data),
    onError: async (_error, _input, owner) => {
      if (owner && getSession()?.id === owner) {
        await queryClient.invalidateQueries({queryKey: trainingKeys.session(sessionId)});
      }
    },
  });
}
