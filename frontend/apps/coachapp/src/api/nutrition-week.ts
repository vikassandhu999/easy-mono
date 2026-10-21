import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {nutritionWeekKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {paths} from './schema';

type WeekPath = paths['/v1/coach/clients/{client_id}/nutrition-week'];
export type NutritionWeek = WeekPath['get']['responses'][200]['content']['application/json']['data'];
export type NutritionPreset = NutritionWeek['presets'][number];
export type NutritionSchedule = NutritionWeek['schedules'][number];
export type NutritionTargets = NutritionWeek['nutrition_targets'][number];
export type TargetSchedule = NutritionWeek['target_schedules'][number];
export type Nutrient = NutritionWeek['nutrients'][number];
export type PresetBody =
  paths['/v1/coach/clients/{client_id}/nutrition-presets']['post']['requestBody']['content']['application/json'];
export type ScheduleBody =
  paths['/v1/coach/clients/{client_id}/nutrition-schedules']['post']['requestBody']['content']['application/json'];
export type ScheduleUpdate =
  paths['/v1/coach/clients/{client_id}/nutrition-schedules/{id}']['patch']['requestBody']['content']['application/json'];
export type TargetsBody =
  paths['/v1/coach/clients/{client_id}/nutrition-targets']['post']['requestBody']['content']['application/json'];
export type TargetDayBody =
  paths['/v1/coach/clients/{client_id}/nutrition-target-days/{weekday}']['put']['requestBody']['content']['application/json'];

export function useNutritionWeek(clientId: string) {
  return useQuery({
    queryKey: nutritionWeekKeys.detail(clientId),
    queryFn: ({signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/nutrition-week', {
          params: {path: {client_id: clientId}},
          signal,
        }),
      ),
    staleTime: 0,
  });
}

export function useNutritionPresets(clientId: string, search: string) {
  return useInfiniteQuery({
    queryKey: nutritionWeekKeys.infinite({clientId, search, type: 'meal'}),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/nutrition-presets', {
          params: {path: {client_id: clientId}, query: {search, type: 'meal', cursor: pageParam, limit: 20}},
          signal,
        }),
      ),
    ...cursorPagination,
  });
}

function useNutritionWrite<TInput, TResult>(clientId: string, mutationFn: (input: TInput) => Promise<TResult>) {
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({queryKey: nutritionWeekKeys.detail(clientId)}),
      queryClient.invalidateQueries({queryKey: nutritionWeekKeys.lists()}),
    ]);
  return useMutation({
    mutationFn,
    onSuccess: refresh,
    onError: refresh,
  });
}

export function useSaveNutritionPreset(clientId: string) {
  return useNutritionWrite(clientId, ({id, body}: {id: string; body: PresetBody}) =>
    call(
      client.PATCH('/v1/coach/clients/{client_id}/nutrition-presets/{id}', {
        params: {path: {client_id: clientId, id}},
        body,
      }),
    ),
  );
}

export function useAddNutritionSchedule(clientId: string) {
  return useNutritionWrite(clientId, (body: ScheduleBody) =>
    call(
      client.POST('/v1/coach/clients/{client_id}/nutrition-schedules', {
        params: {path: {client_id: clientId}},
        body,
      }),
    ),
  );
}

export function useSaveNutritionSchedule(clientId: string) {
  return useNutritionWrite(clientId, ({id, body}: {id: string; body: ScheduleUpdate}) =>
    call(
      client.PATCH('/v1/coach/clients/{client_id}/nutrition-schedules/{id}', {
        params: {path: {client_id: clientId, id}},
        body,
      }),
    ),
  );
}

export function useRemoveNutritionSchedule(clientId: string) {
  return useNutritionWrite(clientId, ({id, weekday}: {id: string; weekday: number}) =>
    call(
      client.DELETE('/v1/coach/clients/{client_id}/nutrition-schedules/{id}', {
        params: {path: {client_id: clientId, id}, query: {weekday}},
      }),
    ),
  );
}

export function useSaveNutritionTargetDay(clientId: string) {
  return useNutritionWrite(clientId, ({weekday, body}: {weekday: number; body: TargetDayBody}) =>
    call(
      client.PUT('/v1/coach/clients/{client_id}/nutrition-target-days/{weekday}', {
        params: {path: {client_id: clientId, weekday}},
        body,
      }),
    ),
  );
}

export function useUndoNutrition(clientId: string) {
  return useNutritionWrite(clientId, (token: string) =>
    call(
      client.POST('/v1/coach/clients/{client_id}/nutrition-undo', {
        params: {path: {client_id: clientId}},
        body: {token},
      }),
    ),
  );
}
