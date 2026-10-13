import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {useRef} from 'react';
import {ApiError, call, callEmpty, client} from './client';
import {exerciseKeys, workoutKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {ExerciseIndex, paths} from './schema';
import {getSession} from './session';

export type Exercise =
  paths['/v1/coach/exercises/{id}']['get']['responses'][200]['content']['application/json']['data'];
export type ExerciseCreate = paths['/v1/coach/exercises']['post']['requestBody']['content']['application/json'];
export type ExerciseUpdate = paths['/v1/coach/exercises/{id}']['patch']['requestBody']['content']['application/json'];
export type ExerciseFilters = Pick<
  NonNullable<paths['/v1/coach/exercises']['get']['parameters']['query']>,
  'search' | 'kind' | 'goal' | 'place'
>;

export function useExercises(filters: ExerciseFilters) {
  return useInfiniteQuery({
    queryKey: exerciseKeys.infinite(filters),
    queryFn: ({pageParam, signal}) =>
      call(client.GET('/v1/coach/exercises', {params: {query: {...filters, cursor: pageParam, limit: 20}}, signal})),
    ...cursorPagination,
  });
}
export function useExercise(id: string) {
  return useQuery({
    queryKey: exerciseKeys.detail(id),
    enabled: Boolean(id),
    staleTime: 0,
    queryFn: ({signal}) => call(client.GET('/v1/coach/exercises/{id}', {params: {path: {id}}, signal})),
  });
}
const refresh = () =>
  Promise.all([
    queryClient.invalidateQueries({queryKey: exerciseKeys.lists()}),
    queryClient.invalidateQueries({queryKey: workoutKeys.all}),
  ]);
export function useSaveExercise() {
  const pending = useRef<ExerciseAttempt | null>(null);
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async (
      input: {kind: 'create'; body: ExerciseCreate} | {kind: 'update'; id: string; body: ExerciseUpdate},
    ) => {
      const sessionId = getSession()?.id;
      if (input.kind === 'update') {
        return call(client.PATCH('/v1/coach/exercises/{id}', {params: {path: {id: input.id}}, body: input.body}));
      }
      if (pending.current) {
        const saved = await checkExerciseCreation(pending.current);
        pending.current = null;
        if (saved) {
          return exerciseMatches(saved, input.body)
            ? {data: saved}
            : call(client.PATCH('/v1/coach/exercises/{id}', {params: {path: {id: saved.id}}, body: input.body}));
        }
      }
      pending.current = {
        sessionId,
        body: structuredClone(input.body),
        before: await matchingExercises(input.body.name),
      };
      requireSession(sessionId);
      try {
        const result = await call(client.POST('/v1/coach/exercises', {body: input.body}));
        pending.current = null;
        return result;
      } catch (cause) {
        if (cause instanceof ApiError && cause.status < 500) {
          pending.current = null;
          throw cause;
        }
        const saved = await checkExerciseCreation(pending.current);
        if (saved) {
          pending.current = null;
          return {data: saved};
        }
        // The unchanged catalogue confirms absence; another submit may create it.
        pending.current = null;
        throw cause;
      }
    },
    onSuccess: async (result, _input, sessionId) => {
      requireSession(sessionId);
      queryClient.setQueryData(exerciseKeys.detail(result.data.id), result);
      await refresh();
    },
  });
}
export function useCopyExercise() {
  const pending = useRef<ExerciseAttempt | null>(null);
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async ({id}: {id: string; name?: string}) => {
      const sessionId = getSession()?.id;
      if (pending.current) {
        const saved = await checkExerciseCreation(pending.current);
        pending.current = null;
        if (saved) {
          return {data: saved};
        }
      }
      const source = await call(client.GET('/v1/coach/exercises/{id}', {params: {path: {id}}}));
      const body = {...source.data, name: `${source.data.name} (copy)`};
      pending.current = {sessionId, body, before: await matchingExercises(body.name)};
      requireSession(sessionId);
      try {
        const result = await call(client.POST('/v1/coach/exercises/{id}/copy', {params: {path: {id}}}));
        pending.current = null;
        return result;
      } catch (cause) {
        if (cause instanceof ApiError && cause.status < 500) {
          pending.current = null;
          throw cause;
        }
        const saved = await checkExerciseCreation(pending.current);
        if (saved) {
          pending.current = null;
          return {data: saved};
        }
        pending.current = null;
        throw cause;
      }
    },
    onSuccess: (_result, _input, sessionId) => {
      requireSession(sessionId);
      return refresh();
    },
  });
}
export function useDeleteExercise() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (id: string) => callEmpty(client.DELETE('/v1/coach/exercises/{id}', {params: {path: {id}}})),
    onSuccess: async (_result, id, sessionId) => {
      requireSession(sessionId);
      queryClient.removeQueries({queryKey: exerciseKeys.detail(id)});
      await refresh();
    },
  });
}

function requireSession(id: string | undefined) {
  if (!id || getSession()?.id !== id) {
    throw new Error('Your session changed. Please try again.');
  }
}

type ExerciseAttempt = {sessionId: string | undefined; body: ExerciseCreate; before: Exercise[]};
async function matchingExercises(name: string) {
  const rows: Exercise[] = [];
  let cursor: string | null = 'start';
  while (cursor) {
    const page: ExerciseIndex = await call(
      client.GET('/v1/coach/exercises', {params: {query: {search: name, cursor, limit: 100}}}),
    );
    rows.push(...page.data);
    cursor = page.next_cursor;
  }
  return rows;
}
function exerciseMatches(exercise: Exercise, body: ExerciseCreate) {
  const normalize = (value: Exercise | ExerciseCreate) => [
    value.name,
    value.kind,
    value.goals,
    value.places,
    value.metrics ?? [],
    value.count_label || null,
    value.grade_scale ?? [],
    value.unilateral ?? false,
    value.equipment ?? [],
    value.muscles ?? [],
    value.media || null,
  ];
  return JSON.stringify(normalize(exercise)) === JSON.stringify(normalize(body));
}
async function checkExerciseCreation(attempt: ExerciseAttempt | null) {
  if (!attempt) {
    throw new Error('The previous creation cannot be checked. Your draft is still here.');
  }
  requireSession(attempt.sessionId);
  const current = await matchingExercises(attempt.body.name);
  requireSession(attempt.sessionId);
  const candidates = current.filter(
    (row) => !attempt.before.some((old) => old.id === row.id) && exerciseMatches(row, attempt.body),
  );
  if (candidates.length === 1 && candidates[0]) {
    return candidates[0];
  }
  if (
    current.length === attempt.before.length &&
    current.every((row) => {
      const old = attempt.before.find((item) => item.id === row.id);
      return old && exerciseMatches(row, old);
    })
  ) {
    return null;
  }
  throw new Error(
    'The creation could not be confirmed. Your draft is still here. Check the exercise library before creating another copy.',
  );
}
