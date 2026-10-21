import {useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {foodKeys} from './keys';

export type {Food, FoodServing, MealItem, MealOption, Nutrient, NutrientMap, NutritionPreset} from './schema';
export function useFoods(search: string) {
  return useQuery({
    queryKey: foodKeys.list(search),
    queryFn: ({signal}) => call(client.GET('/v1/client/foods', {params: {query: {search, limit: 50}}, signal})),
  });
}
