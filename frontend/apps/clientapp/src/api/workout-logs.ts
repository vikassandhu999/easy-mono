import type {SessionOperation} from '@easy/workouts/session';
import {useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {dayKeys, workoutLogKeys} from './keys';
import {queryClient} from './query-client';
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

export function useWorkoutLog(id: string) {
  return useQuery({
    queryKey: workoutLogKeys.detail(id),
    enabled: Boolean(id),
    queryFn: ({signal}) => call(client.GET('/v1/client/workout-logs/{id}', {params: {path: {id}}, signal})),
  });
}

async function execute(op: SessionOperation) {
  switch (op.action) {
    case 'start':
      return call(client.POST('/v1/client/workout-logs', {body: op.body}));
    case 'update':
      return call(client.PATCH('/v1/client/workout-logs/{id}', {params: {path: {id: op.id}}, body: op.body}));
    case 'finish':
      return call(client.POST('/v1/client/workout-logs/{id}/finish', {params: {path: {id: op.id}}, body: op.body}));
    case 'discard':
      return call(client.POST('/v1/client/workout-logs/{id}/discard', {params: {path: {id: op.id}}}));
    case 'reopen':
      return call(client.POST('/v1/client/workout-logs/{id}/reopen', {params: {path: {id: op.id}}}));
    case 'startActivity':
      return call(
        client.POST('/v1/client/workout-logs/{id}/exercise-logs', {params: {path: {id: op.id}}, body: op.body}),
      );
    case 'updateActivity':
      return call(
        client.PATCH('/v1/client/workout-logs/{id}/exercise-logs/{activity_id}', {
          params: {path: {id: op.id, activity_id: op.activityId}},
          body: op.body,
        }),
      );
    case 'completeActivity':
      return call(
        client.POST('/v1/client/workout-logs/{id}/exercise-logs/{activity_id}/complete', {
          params: {path: {id: op.id, activity_id: op.activityId}},
          body: op.body,
        }),
      );
    case 'skipActivity':
      return call(
        client.POST('/v1/client/workout-logs/{id}/exercise-logs/{activity_id}/skip', {
          params: {path: {id: op.id, activity_id: op.activityId}},
        }),
      );
    case 'reopenActivity':
      return call(
        client.POST('/v1/client/workout-logs/{id}/exercise-logs/{activity_id}/reopen', {
          params: {path: {id: op.id, activity_id: op.activityId}},
        }),
      );
    case 'replaceActivity':
      return call(
        client.POST('/v1/client/workout-logs/{id}/exercise-logs/{activity_id}/replace', {
          params: {path: {id: op.id, activity_id: op.activityId}},
          body: op.body,
        }),
      );
    case 'recordSet':
      return call(
        client.POST('/v1/client/workout-logs/{id}/exercise-logs/{activity_id}/sets', {
          params: {path: {id: op.id, activity_id: op.activityId}},
          body: op.body,
        }),
      );
    case 'correctSet':
      return call(
        client.PATCH('/v1/client/workout-logs/{id}/exercise-logs/{activity_id}/sets/{set_id}', {
          params: {path: {id: op.id, activity_id: op.activityId, set_id: op.setId}},
          body: op.body,
        }),
      );
    case 'removeSet':
      return call(
        client.DELETE('/v1/client/workout-logs/{id}/exercise-logs/{activity_id}/sets/{set_id}', {
          params: {path: {id: op.id, activity_id: op.activityId, set_id: op.setId}},
        }),
      );
  }
}

export function useRecording() {
  const write = useMutation({
    networkMode: 'always',
    retry: false,
    onMutate: () => getSession()?.id,
    mutationFn: execute,
    onSuccess: async (result, _op, owner) => {
      if (!owner || getSession()?.id !== owner) {
        return;
      }
      queryClient.setQueryData(workoutLogKeys.detail(result.data.id), result);
      await queryClient.invalidateQueries({queryKey: dayKeys.all});
    },
  });
  const run = write.mutateAsync;
  return {
    execute: run,
    reload: async (id: string) => {
      const owner = getSession()?.id;
      const result = await call(client.GET('/v1/client/workout-logs/{id}', {params: {path: {id}}}));
      if (!owner || getSession()?.id !== owner) {
        throw new Error('Your session changed. Please try again.');
      }
      queryClient.setQueryData(workoutLogKeys.detail(id), result);
      await queryClient.invalidateQueries({queryKey: dayKeys.all});
      return result;
    },
  };
}
