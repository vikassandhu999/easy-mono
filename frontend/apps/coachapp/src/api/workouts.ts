import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {useRef} from 'react';
import {ApiError, call, callEmpty, client} from './client';
import {workoutKeys, workoutWeekKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {paths, WorkoutIndex} from './schema';
import {getSession} from './session';

export type Workout = paths['/v1/coach/workouts/{id}']['get']['responses'][200]['content']['application/json']['data'];
export type WorkoutBody = paths['/v1/coach/workouts']['post']['requestBody']['content']['application/json'];
export type WorkoutGroup = Workout['groups'][number];
export type WorkoutExercise = WorkoutGroup['exercises'][number];
export type WorkoutFilters = Pick<
  NonNullable<paths['/v1/coach/workouts']['get']['parameters']['query']>,
  'search' | 'type'
>;
export function useWorkouts(filters: WorkoutFilters, clientId?: string) {
  return useInfiniteQuery({
    queryKey: workoutKeys.infinite({...filters, clientId}),
    queryFn: ({pageParam, signal}) =>
      clientId
        ? call(
            client.GET('/v1/coach/clients/{client_id}/workouts', {
              params: {path: {client_id: clientId}, query: {...filters, cursor: pageParam, limit: 20}},
              signal,
            }),
          )
        : call(client.GET('/v1/coach/workouts', {params: {query: {...filters, cursor: pageParam, limit: 20}}, signal})),
    ...cursorPagination,
  });
}
export function useWorkout(id: string, clientId?: string) {
  return useQuery({
    queryKey: workoutKeys.detail(id),
    enabled: Boolean(id),
    staleTime: 0,
    queryFn: ({signal}) =>
      clientId
        ? call(
            client.GET('/v1/coach/clients/{client_id}/workouts/{id}', {
              params: {path: {client_id: clientId, id}},
              signal,
            }),
          )
        : call(client.GET('/v1/coach/workouts/{id}', {params: {path: {id}}, signal})),
  });
}
export function useSaveWorkout(clientId?: string) {
  const pending = useRef<WorkoutAttempt | null>(null);
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async ({id, body}: {id?: string; body: WorkoutBody}) => {
      const sessionId = getSession()?.id;
      if (!id) {
        if (pending.current) {
          const saved = await checkWorkoutCreation(pending.current, clientId);
          pending.current = null;
          if (saved) {
            return workoutMatches(saved, body)
              ? {data: saved, undo_token: null}
              : clientId
                ? call(
                    client.PATCH('/v1/coach/clients/{client_id}/workouts/{id}', {
                      params: {path: {client_id: clientId, id: saved.id}},
                      body,
                    }),
                  )
                : call(client.PATCH('/v1/coach/workouts/{id}', {params: {path: {id: saved.id}}, body}));
          }
        }
        pending.current = {sessionId, body: structuredClone(body), before: await matchingWorkouts(body.name, clientId)};
        requireSession(sessionId);
        try {
          const result = clientId
            ? await call(
                client.POST('/v1/coach/clients/{client_id}/workouts', {params: {path: {client_id: clientId}}, body}),
              )
            : await call(client.POST('/v1/coach/workouts', {body}));
          pending.current = null;
          return result;
        } catch (cause) {
          if (cause instanceof ApiError && cause.status < 500) {
            pending.current = null;
            throw cause;
          }
          const saved = await checkWorkoutCreation(pending.current, clientId);
          if (saved) {
            pending.current = null;
            return {data: saved, undo_token: null};
          }
          pending.current = null;
          throw cause;
        }
      }
      const before =
        clientId && id
          ? await call(
              client.GET('/v1/coach/clients/{client_id}/workout-week', {params: {path: {client_id: clientId}}}),
            )
          : null;
      if (id && before && !before.data.workouts.some((workout) => workout.id === id)) {
        const matching = before.data.workouts.filter((workout) => workoutMatches(workout, body));
        if (matching.length === 1 && matching[0]) {
          return {data: matching[0], undo_token: null};
        }
        throw new Error(
          'This workout was replaced. Open the training week to check its saved version. Your draft stays on this device.',
        );
      }
      requireSession(sessionId);
      try {
        return clientId
          ? id
            ? await call(
                client.PATCH('/v1/coach/clients/{client_id}/workouts/{id}', {
                  params: {path: {client_id: clientId, id}},
                  body,
                }),
              )
            : await call(
                client.POST('/v1/coach/clients/{client_id}/workouts', {params: {path: {client_id: clientId}}, body}),
              )
          : id
            ? await call(client.PATCH('/v1/coach/workouts/{id}', {params: {path: {id}}, body}))
            : await call(client.POST('/v1/coach/workouts', {body}));
      } catch (cause) {
        if (!id || (cause instanceof ApiError && cause.status < 500)) {
          throw cause;
        }
        requireSession(sessionId);
        // A committed W37 copy can lose its response. Match the requested content and a newly returned identity before retrying.
        if (clientId && before) {
          const current = await call(
            client.GET('/v1/coach/clients/{client_id}/workout-week', {params: {path: {client_id: clientId}}}),
          );
          const matching = current.data.workouts.filter(
            (workout) =>
              (workout.id === id || !before.data.workouts.some((old) => old.id === workout.id)) &&
              workoutMatches(workout, body),
          );
          if (matching.length === 1 && matching[0]) {
            return {data: matching[0], undo_token: null};
          }
        } else {
          const current = await call(client.GET('/v1/coach/workouts/{id}', {params: {path: {id}}}));
          if (workoutMatches(current.data, body)) {
            return current;
          }
        }
        throw cause;
      }
    },
    onSuccess: async (result, _input, sessionId) => {
      requireSession(sessionId);
      queryClient.setQueryData(workoutKeys.detail(result.data.id), {data: result.data});
      await Promise.all([
        queryClient.invalidateQueries({queryKey: workoutKeys.lists()}),
        ...(clientId ? [queryClient.invalidateQueries({queryKey: workoutWeekKeys.detail(clientId)})] : []),
      ]);
    },
  });
}
export function useDeleteWorkout() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (id: string) => callEmpty(client.DELETE('/v1/coach/workouts/{id}', {params: {path: {id}}})),
    onSuccess: async (_result, id, sessionId) => {
      requireSession(sessionId);
      queryClient.removeQueries({queryKey: workoutKeys.detail(id)});
      await queryClient.invalidateQueries({queryKey: workoutKeys.lists()});
    },
  });
}
export function useCopyWorkout() {
  const pending = useRef<WorkoutAttempt | null>(null);
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async ({id}: {id: string; name?: string}) => {
      const sessionId = getSession()?.id;
      if (pending.current) {
        const saved = await checkWorkoutCreation(pending.current);
        pending.current = null;
        if (saved) {
          return {data: saved};
        }
      }
      const source = await call(client.GET('/v1/coach/workouts/{id}', {params: {path: {id}}}));
      const body = {...source.data, name: `${source.data.name} (copy)`};
      pending.current = {sessionId, body, before: await matchingWorkouts(body.name)};
      requireSession(sessionId);
      try {
        const result = await call(client.POST('/v1/coach/workouts/{id}/copy', {params: {path: {id}}}));
        pending.current = null;
        return result;
      } catch (cause) {
        if (cause instanceof ApiError && cause.status < 500) {
          pending.current = null;
          throw cause;
        }
        const saved = await checkWorkoutCreation(pending.current);
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
      return queryClient.invalidateQueries({queryKey: workoutKeys.lists()});
    },
  });
}

function targetSignature(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(targetSignature);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, targetSignature(item)]),
    );
  }
  return value;
}
export function workoutMatches(workout: Workout, body: WorkoutBody) {
  const normalize = (source: Workout | WorkoutBody) => ({
    name: source.name,
    description: source.description || null,
    type: source.type ?? 'prescribed',
    video: source.video || null,
    groups: (source.groups ?? []).map((group) => ({
      name: group.name || null,
      rounds: group.rounds,
      exercises: group.exercises.map((exercise) => ({
        exercise_id: exercise.exercise_id,
        targets_mode: exercise.targets_mode ?? 'same_for_all',
        targets: exercise.targets ?? [{}],
        rest: (exercise.rest ?? []).length === 0 ? (exercise.targets ?? [{}]).map(() => null) : exercise.rest,
      })),
    })),
  });
  return JSON.stringify(targetSignature(normalize(workout))) === JSON.stringify(targetSignature(normalize(body)));
}

function requireSession(id: string | undefined) {
  if (!id || getSession()?.id !== id) {
    throw new Error('Your session changed. Please try again.');
  }
}

type WorkoutAttempt = {sessionId: string | undefined; body: WorkoutBody; before: Workout[]};
async function matchingWorkouts(name: string, clientId?: string) {
  const rows: Workout[] = [];
  let cursor: string | null = 'start';
  while (cursor) {
    const page: WorkoutIndex = clientId
      ? await call(
          client.GET('/v1/coach/clients/{client_id}/workouts', {
            params: {path: {client_id: clientId}, query: {search: name, cursor, limit: 100}},
          }),
        )
      : await call(client.GET('/v1/coach/workouts', {params: {query: {search: name, cursor, limit: 100}}}));
    rows.push(...page.data);
    cursor = page.next_cursor;
  }
  return rows;
}
async function checkWorkoutCreation(attempt: WorkoutAttempt | null, clientId?: string) {
  if (!attempt) {
    throw new Error('The previous creation cannot be checked. Your draft is still here.');
  }
  requireSession(attempt.sessionId);
  const current = await matchingWorkouts(attempt.body.name, clientId);
  requireSession(attempt.sessionId);
  const candidates = current.filter(
    (row) => !attempt.before.some((old) => old.id === row.id) && workoutMatches(row, attempt.body),
  );
  if (candidates.length === 1 && candidates[0]) {
    return candidates[0];
  }
  if (
    current.length === attempt.before.length &&
    current.every((row) => {
      const old = attempt.before.find((item) => item.id === row.id);
      return old && workoutMatches(row, old);
    })
  ) {
    return null;
  }
  throw new Error(
    'The creation could not be confirmed. Your draft is still here. Check the workout library before creating another copy.',
  );
}
