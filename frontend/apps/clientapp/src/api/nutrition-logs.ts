import {useMutation} from '@tanstack/react-query';
import {call, client} from './client';
import {dayKeys, nutritionLogKeys} from './keys';
import {queryClient} from './query-client';
import type {paths} from './schema';
import {getSession} from './session';

export type {FoodLog, NutritionLog} from './schema';
export type NutritionInput = paths['/v1/client/nutrition-logs']['post']['requestBody']['content']['application/json'];
export type NutritionCorrection =
  paths['/v1/client/nutrition-logs/{id}']['patch']['requestBody']['content']['application/json'];
function refresh(owner: string | undefined) {
  return getSession()?.id === owner ? queryClient.invalidateQueries({queryKey: dayKeys.all}) : Promise.resolve();
}
export function useSaveNutrition() {
  return useMutation({
    networkMode: 'always',
    retry: false,
    onMutate: () => getSession()?.id,
    mutationFn: (op: {id?: string; body: NutritionInput}) => {
      if (op.id) {
        const {nutrition_schedule_id: _schedule, scheduled_date: _date, ...body} = op.body;
        return call(client.PATCH('/v1/client/nutrition-logs/{id}', {params: {path: {id: op.id}}, body}));
      }
      return call(client.POST('/v1/client/nutrition-logs', {body: op.body}));
    },
    onSuccess: async (result, _op, owner) => {
      if (getSession()?.id === owner) {
        queryClient.setQueryData(nutritionLogKeys.detail(result.data.id), {data: result.data});
      }
      await refresh(owner);
    },
  });
}
export function useDeleteNutrition() {
  return useMutation({
    networkMode: 'always',
    retry: false,
    onMutate: () => getSession()?.id,
    mutationFn: (id: string) => call(client.DELETE('/v1/client/nutrition-logs/{id}', {params: {path: {id}}})),
    onSuccess: async (_result, id, owner) => {
      if (getSession()?.id === owner) {
        queryClient.removeQueries({queryKey: nutritionLogKeys.detail(id)});
      }
      await refresh(owner);
    },
  });
}
export function useRestoreNutrition() {
  return useMutation({
    networkMode: 'always',
    retry: false,
    onMutate: () => getSession()?.id,
    mutationFn: (undo_token: string) => call(client.POST('/v1/client/nutrition-logs/restore', {body: {undo_token}})),
    onSuccess: async (result, _op, owner) => {
      if (getSession()?.id === owner) {
        queryClient.setQueryData(nutritionLogKeys.detail(result.data.id), {data: result.data});
      }
      await refresh(owner);
    },
  });
}
