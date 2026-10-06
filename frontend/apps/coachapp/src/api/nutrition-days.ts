import {useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {nutritionDayKeys} from './keys';

export type {DiaryEntry, DiaryMeal, NutrientMap, NutritionDay, NutritionPortion, NutritionSlot} from './schema';

export function useNutritionDay(clientId: string, date?: string) {
  return useQuery({
    queryKey: nutritionDayKeys.day(clientId, date),
    queryFn: ({signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/nutrition-days', {
          params: {path: {client_id: clientId}, query: date ? {date} : {}},
          signal,
        }),
      ),
    staleTime: 0,
  });
}

export function useNutritionDays(clientId: string, from: string, to: string) {
  return useQuery({
    queryKey: nutritionDayKeys.range(clientId, from, to),
    enabled: Boolean(from && to),
    staleTime: 0,
    queryFn: ({signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/nutrition-days', {
          params: {path: {client_id: clientId}, query: {from, to}},
          signal,
        }),
      ),
  });
}
export function useNutritionFoodMetrics(clientId: string, from: string, to: string) {
  return useQuery({
    queryKey: nutritionDayKeys.metrics(clientId, from, to),
    enabled: Boolean(from && to),
    staleTime: 0,
    queryFn: ({signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/nutrition-food-metrics', {
          params: {path: {client_id: clientId}, query: {from, to}},
          signal,
        }),
      ),
  });
}
