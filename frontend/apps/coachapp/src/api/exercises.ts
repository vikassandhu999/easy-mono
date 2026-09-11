import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {exerciseKeys, trainingPlanKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {ExerciseCreate, ExerciseUpdate} from './schema';
import {getSession} from './session';

export type {Exercise, ExerciseCreate, ExerciseRelation, ExerciseUpdate} from './schema';

export function useExercises(search: string) {
  return useInfiniteQuery({
    queryKey: exerciseKeys.infinite(search),
    queryFn: async ({pageParam, signal}) => {
      const page = await call(
        client.GET('/v1/coach/training-exercises', {params: {query: {search, cursor: pageParam, limit: 20}}, signal}),
      );
      return {...page, next_cursor: page.next_cursor ?? null};
    },
    ...cursorPagination,
  });
}

export function useExercise(id: string) {
  return useQuery({
    queryKey: exerciseKeys.detail(id),
    enabled: Boolean(id),
    staleTime: 0,
    queryFn: ({signal}) => call(client.GET('/v1/coach/training-exercises/{id}', {params: {path: {id}}, signal})),
  });
}
export function useSaveExercise() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (input: {kind: 'create'; body: ExerciseCreate} | {kind: 'update'; id: string; body: ExerciseUpdate}) =>
      input.kind === 'create'
        ? call(client.POST('/v1/coach/training-exercises', {body: input.body}))
        : call(client.PATCH('/v1/coach/training-exercises/{id}', {params: {path: {id: input.id}}, body: input.body})),
    onSuccess: async (_result, input, sessionId) => {
      if (!sessionId || getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
      await Promise.all([
        queryClient.invalidateQueries({queryKey: exerciseKeys.all}),
        ...(input.kind === 'update' ? [queryClient.invalidateQueries({queryKey: trainingPlanKeys.all})] : []),
      ]);
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
    },
    onError: async (_error, input, sessionId) => {
      if (sessionId && getSession()?.id === sessionId) {
        await Promise.all([
          queryClient.invalidateQueries({queryKey: exerciseKeys.all}),
          ...(input.kind === 'update' ? [queryClient.invalidateQueries({queryKey: trainingPlanKeys.all})] : []),
        ]);
      }
    },
  });
}

export function useExerciseRelations(kind: 'muscles' | 'equipment', search: string) {
  return useQuery({
    queryKey: exerciseKeys.relations(kind, search),
    queryFn: ({signal}) =>
      kind === 'muscles'
        ? call(client.GET('/v1/coach/training-muscles', {params: {query: {search}}, signal}))
        : call(client.GET('/v1/coach/training-equipment', {params: {query: {search}}, signal})),
  });
}
