import {useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {workoutKeys, workoutWeekKeys} from './keys';
import {queryClient} from './query-client';
import type {paths} from './schema';

export type WorkoutWeek =
  paths['/v1/coach/clients/{client_id}/workout-week']['get']['responses'][200]['content']['application/json']['data'];
export type WorkoutSchedule = WorkoutWeek['schedules'][number];
export type ScheduleBody =
  paths['/v1/coach/clients/{client_id}/workout-schedules']['post']['requestBody']['content']['application/json'];
export type ScheduleUpdate =
  paths['/v1/coach/clients/{client_id}/workout-schedules/{id}']['patch']['requestBody']['content']['application/json'];

export function useWorkoutWeek(clientId: string) {
  return useQuery({
    queryKey: workoutWeekKeys.detail(clientId),
    queryFn: ({signal}) =>
      call(client.GET('/v1/coach/clients/{client_id}/workout-week', {params: {path: {client_id: clientId}}, signal})),
    staleTime: 0,
  });
}

function useWeekWrite<TInput, TResult>(clientId: string, mutationFn: (input: TInput) => Promise<TResult>) {
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({queryKey: workoutWeekKeys.detail(clientId)}),
      queryClient.invalidateQueries({queryKey: workoutKeys.lists()}),
      queryClient.invalidateQueries({queryKey: workoutKeys.details()}),
    ]);
  return useMutation({mutationFn, onSuccess: refresh, onError: refresh});
}

export function useAddWorkoutSchedule(clientId: string) {
  return useWeekWrite(clientId, (body: ScheduleBody) =>
    call(client.POST('/v1/coach/clients/{client_id}/workout-schedules', {params: {path: {client_id: clientId}}, body})),
  );
}
export function useSaveWorkoutSchedule(clientId: string) {
  return useWeekWrite(clientId, ({id, body}: {id: string; body: ScheduleUpdate}) =>
    call(
      client.PATCH('/v1/coach/clients/{client_id}/workout-schedules/{id}', {
        params: {path: {client_id: clientId, id}},
        body,
      }),
    ),
  );
}
export function useRemoveWorkoutSchedule(clientId: string) {
  return useWeekWrite(clientId, ({id, weekday}: {id: string; weekday: number}) =>
    call(
      client.DELETE('/v1/coach/clients/{client_id}/workout-schedules/{id}', {
        params: {path: {client_id: clientId, id}, query: {weekday}},
      }),
    ),
  );
}
export function useUndoWorkoutWeek(clientId: string) {
  return useWeekWrite(clientId, (token: string) =>
    call(
      client.POST('/v1/coach/clients/{client_id}/workout-undo', {params: {path: {client_id: clientId}}, body: {token}}),
    ),
  );
}
