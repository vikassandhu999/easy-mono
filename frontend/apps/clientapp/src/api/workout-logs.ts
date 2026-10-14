import {useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {dayKeys, workoutLogKeys} from './keys';
import {queryClient} from './query-client';
import type {paths} from './schema';
import {getSession} from './session';

export type {ExerciseSetWrite, WorkoutLog} from './schema';
export type WorkoutStart = paths['/v1/client/workout-logs']['post']['requestBody']['content']['application/json'];
export type WorkoutUpdate =
  paths['/v1/client/workout-logs/{id}']['patch']['requestBody']['content']['application/json'];
export type WorkoutFinish =
  paths['/v1/client/workout-logs/{id}/finish']['post']['requestBody']['content']['application/json'];
type Operation =
  | {action: 'start'; body: WorkoutStart}
  | {action: 'update'; id: string; body: WorkoutUpdate}
  | {action: 'finish'; id: string; body: WorkoutFinish}
  | {action: 'discard' | 'reopen' | 'delete'; id: string}
  | {action: 'restore'; token: string};
export function useWorkoutLog(id: string) {
  return useQuery({
    queryKey: workoutLogKeys.detail(id),
    enabled: Boolean(id),
    queryFn: ({signal}) => call(client.GET('/v1/client/workout-logs/{id}', {params: {path: {id}}, signal})),
  });
}
export function useWriteWorkout() {
  return useMutation({
    networkMode: 'always',
    retry: false,
    onMutate: () => getSession()?.id,
    mutationFn: async (op: Operation) => {
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
        case 'delete':
          return call(client.DELETE('/v1/client/workout-logs/{id}', {params: {path: {id: op.id}}}));
        case 'restore':
          return call(client.POST('/v1/client/workout-logs/restore', {body: {undo_token: op.token}}));
      }
    },
    onSuccess: async (result, op, owner) => {
      if (getSession()?.id !== owner) {
        return;
      }
      if ('data' in result) {
        queryClient.setQueryData(workoutLogKeys.detail(result.data.id), {data: result.data});
      }
      if (op.action === 'delete') {
        queryClient.removeQueries({queryKey: workoutLogKeys.detail(op.id)});
      }
      await queryClient.invalidateQueries({queryKey: dayKeys.all});
    },
  });
}
