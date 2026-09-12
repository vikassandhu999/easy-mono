import {useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {nutritionDayKeys} from './keys';

export type {
  Day as NutritionDay,
  FoodNutrients,
  NutritionDayRow,
  NutritionDaySlot,
  NutritionPortion,
} from './schema';

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
