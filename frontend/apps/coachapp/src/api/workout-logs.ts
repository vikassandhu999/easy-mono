import type {SessionOperation} from '@easy/workouts/session';
import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {ApiError, call, client} from './client';
import {workoutLogKeys, workoutWeekKeys} from './keys';
import {queryClient} from './query-client';
import type {WorkoutLog, WorkoutLogListQuery, WorkoutLogStart} from './schema';
import {getSession} from './session';

export type {
  ExerciseLog,
  ExerciseLogReplace,
  ExerciseLogStart,
  ExerciseLogUpdate,
  ExerciseSet,
  ExerciseSetCorrect,
  ExerciseSetRecord,
  Measurements,
  ResultUnits,
  WorkoutLog,
  WorkoutLogFeedback,
  WorkoutLogStart,
  WorkoutLogUpdate,
} from './schema';

export function useWorkoutLog(clientId: string, id: string) {
  return useQuery({
    queryKey: workoutLogKeys.detail(clientId, id),
    enabled: Boolean(id),
    queryFn: ({signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/workout-logs/{id}', {
          params: {path: {client_id: clientId, id}},
          signal,
        }),
      ),
  });
}

async function execute(clientId: string, op: SessionOperation) {
  switch (op.action) {
    case 'start':
      return call(
        client.POST('/v1/coach/clients/{client_id}/workout-logs', {
          params: {path: {client_id: clientId}},
          body: op.body,
        }),
      );
    case 'update':
      return call(
        client.PATCH('/v1/coach/clients/{client_id}/workout-logs/{id}', {
          params: {path: {client_id: clientId, id: op.id}},
          body: op.body,
        }),
      );
    case 'finish':
      return call(
        client.POST('/v1/coach/clients/{client_id}/workout-logs/{id}/finish', {
          params: {path: {client_id: clientId, id: op.id}},
          body: op.body,
        }),
      );
    case 'discard':
      return call(
        client.POST('/v1/coach/clients/{client_id}/workout-logs/{id}/discard', {
          params: {path: {client_id: clientId, id: op.id}},
        }),
      );
    case 'reopen':
      return call(
        client.POST('/v1/coach/clients/{client_id}/workout-logs/{id}/reopen', {
          params: {path: {client_id: clientId, id: op.id}},
        }),
      );
    case 'startActivity':
      return call(
        client.POST('/v1/coach/clients/{client_id}/workout-logs/{id}/exercise-logs', {
          params: {path: {client_id: clientId, id: op.id}},
          body: op.body,
        }),
      );
    case 'updateActivity':
      return call(
        client.PATCH('/v1/coach/clients/{client_id}/workout-logs/{id}/exercise-logs/{activity_id}', {
          params: {path: {client_id: clientId, id: op.id, activity_id: op.activityId}},
          body: op.body,
        }),
      );
    case 'completeActivity':
      return call(
        client.POST('/v1/coach/clients/{client_id}/workout-logs/{id}/exercise-logs/{activity_id}/complete', {
          params: {path: {client_id: clientId, id: op.id, activity_id: op.activityId}},
          body: op.body,
        }),
      );
    case 'skipActivity':
      return call(
        client.POST('/v1/coach/clients/{client_id}/workout-logs/{id}/exercise-logs/{activity_id}/skip', {
          params: {path: {client_id: clientId, id: op.id, activity_id: op.activityId}},
        }),
      );
    case 'reopenActivity':
      return call(
        client.POST('/v1/coach/clients/{client_id}/workout-logs/{id}/exercise-logs/{activity_id}/reopen', {
          params: {path: {client_id: clientId, id: op.id, activity_id: op.activityId}},
        }),
      );
    case 'replaceActivity':
      return call(
        client.POST('/v1/coach/clients/{client_id}/workout-logs/{id}/exercise-logs/{activity_id}/replace', {
          params: {path: {client_id: clientId, id: op.id, activity_id: op.activityId}},
          body: op.body,
        }),
      );
    case 'recordSet':
      return call(
        client.POST('/v1/coach/clients/{client_id}/workout-logs/{id}/exercise-logs/{activity_id}/sets', {
          params: {path: {client_id: clientId, id: op.id, activity_id: op.activityId}},
          body: op.body,
        }),
      );
    case 'correctSet':
      return call(
        client.PATCH('/v1/coach/clients/{client_id}/workout-logs/{id}/exercise-logs/{activity_id}/sets/{set_id}', {
          params: {path: {client_id: clientId, id: op.id, activity_id: op.activityId, set_id: op.setId}},
          body: op.body,
        }),
      );
    case 'removeSet':
      return call(
        client.DELETE('/v1/coach/clients/{client_id}/workout-logs/{id}/exercise-logs/{activity_id}/sets/{set_id}', {
          params: {path: {client_id: clientId, id: op.id, activity_id: op.activityId, set_id: op.setId}},
        }),
      );
  }
}

export function useRecording(clientId: string) {
  const write = useMutation({
    networkMode: 'always',
    retry: false,
    onMutate: () => getSession()?.id,
    mutationFn: (op: SessionOperation) => execute(clientId, op),
    onSuccess: async (result, _op, owner) => {
      if (!owner || getSession()?.id !== owner) {
        return;
      }
      queryClient.setQueryData(workoutLogKeys.detail(clientId, result.data.id), result);
      await refresh(clientId);
    },
  });
  const run = write.mutateAsync;
  return {
    execute: run,
    reload: async (id: string) => {
      const owner = getSession()?.id;
      const result = await call(
        client.GET('/v1/coach/clients/{client_id}/workout-logs/{id}', {params: {path: {client_id: clientId, id}}}),
      );
      if (!owner || getSession()?.id !== owner) {
        throw new Error('Your session changed. Please try again.');
      }
      queryClient.setQueryData(workoutLogKeys.detail(clientId, id), result);
      await refresh(clientId);
      return result;
    },
  };
}

function refresh(clientId: string) {
  return Promise.all([
    queryClient.invalidateQueries({queryKey: workoutLogKeys.lists()}),
    queryClient.invalidateQueries({queryKey: workoutWeekKeys.detail(clientId)}),
  ]);
}

export type WorkoutLogFilters = Pick<WorkoutLogListQuery, 'date' | 'state' | 'scheduled_date'>;
const pageSize = 20;
export function useWorkoutLogs(clientId: string, filters: WorkoutLogFilters = {}) {
  return useInfiniteQuery({
    queryKey: workoutLogKeys.infinite(clientId, filters),
    initialPageParam: '0',
    staleTime: 0,
    queryFn: async ({pageParam, signal}) => {
      const offset = Number(pageParam);
      const result = await call(
        client.GET('/v1/coach/clients/{client_id}/workout-logs', {
          params: {path: {client_id: clientId}, query: {...filters, offset, limit: pageSize}},
          signal,
        }),
      );
      // This endpoint deliberately uses the plan's offset contract. Adapt it for InfiniteList.
      return {
        data: result.workout_logs,
        count: result.count,
        next_cursor:
          result.workout_logs.length > 0 && offset + pageSize < result.count ? String(offset + pageSize) : null,
      };
    },
    getNextPageParam: (page) => page.next_cursor,
  });
}

export function useActiveWorkoutLog(clientId: string) {
  return useQuery({
    queryKey: workoutLogKeys.list(clientId, {state: 'active'}),
    enabled: Boolean(clientId),
    staleTime: 0,
    queryFn: async ({signal}) => {
      const page = await call(
        client.GET('/v1/coach/clients/{client_id}/workout-logs', {
          params: {path: {client_id: clientId}, query: {state: 'active', limit: 1}},
          signal,
        }),
      );
      return {data: page.workout_logs[0] ?? null};
    },
  });
}

export function useOccurrenceWorkoutLogs(clientId: string, date: string) {
  return useQuery({
    queryKey: workoutLogKeys.list(clientId, {scheduled_date: date}),
    enabled: Boolean(clientId && date),
    staleTime: 0,
    queryFn: async ({signal}) => {
      const logs: WorkoutLog[] = [];
      let offset = 0;
      while (true) {
        const page = await call(
          client.GET('/v1/coach/clients/{client_id}/workout-logs', {
            params: {path: {client_id: clientId}, query: {scheduled_date: date, offset, limit: 100}},
            signal,
          }),
        );
        logs.push(...page.workout_logs);
        offset += page.workout_logs.length;
        if (offset >= page.count || page.workout_logs.length === 0) {
          return {data: logs};
        }
      }
    },
  });
}

export function useStartSession(clientId: string) {
  const recording = useRecording(clientId);
  return useMutation({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({scheduleId, date}: {scheduleId: string; date: string}) => {
      const owner = getSession()?.id;
      if (!owner) {
        throw new Error('Please sign in to continue.');
      }
      const key = `easy.workout-start.v1:${owner}:${clientId}:${scheduleId}:${date}`;
      let id: string;
      try {
        const saved = localStorage.getItem(key);
        id = saved && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(saved) ? saved : crypto.randomUUID();
        localStorage.setItem(key, id);
      } catch {
        throw new Error('The session start could not be kept on this device. Try again before recording.');
      }
      const body = {id, schedule_id: scheduleId, scheduled_date: date, date} satisfies WorkoutLogStart;
      let result: Awaited<ReturnType<typeof recording.execute>>;
      try {
        result = await recording.execute({action: 'start', body});
      } catch (cause) {
        if (cause instanceof ApiError && cause.status >= 400 && cause.status < 500 && getSession()?.id === owner) {
          try {
            localStorage.removeItem(key);
          } catch {
            // Keep the API error if device storage cannot remove the rejected request.
          }
        }
        throw cause;
      }
      if (getSession()?.id !== owner) {
        throw new Error('Your session changed. Please try again.');
      }
      try {
        localStorage.removeItem(key);
      } catch {
        // An acknowledged request can safely replay if device storage cannot clear it.
      }
      return result;
    },
  });
}
