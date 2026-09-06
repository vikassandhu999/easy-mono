/** Client nutrition day reads and saves. */
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from './client.ts';
import {foodKeys, nutritionDayKeys, recipeKeys} from './keys.ts';
import type {Day, DaySave, NutritionDaySlot as NutritionDaySlotSchema, paths} from './schema.ts';

export type {
  Food,
  NutritionDayOption,
  NutritionDayOptionItem,
  NutritionDayRow,
  Recipe,
} from '@/api/schema';
export type NutritionDay = Day;
export type NutritionDaySlot = NutritionDaySlotSchema;
export type DiaryMealSlot = NutritionDaySlot['meal_slot'];
export type SaveNutritionDayRequest = DaySave & {date: string};

type NutritionDayQuery = paths['/v1/client/nutrition-days']['get']['parameters']['query'];
type FoodListQuery = paths['/v1/client/nutrition-foods']['get']['parameters']['query'];
type RecipeListQuery = paths['/v1/client/nutrition-recipes']['get']['parameters']['query'];

// ── Queries ──────────────────────────────────────────────────

export function useListClientNutritionDaysQuery(query: NutritionDayQuery = {}, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: nutritionDayKeys.list(query),
    queryFn: () => call(client.GET('/v1/client/nutrition-days', {params: {query}})),
    enabled: options?.enabled ?? true,
  });
}

export function useListClientFoodsQuery(query: FoodListQuery = {}, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: foodKeys.list(query),
    queryFn: () => call(client.GET('/v1/client/nutrition-foods', {params: {query}})),
    enabled: options?.enabled ?? true,
  });
}

export function useListClientRecipesQuery(query: RecipeListQuery = {}, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: recipeKeys.list(query),
    queryFn: () => call(client.GET('/v1/client/nutrition-recipes', {params: {query}})),
    enabled: options?.enabled ?? true,
  });
}

// ── Save ─────────────────────────────────────────────────────

type NutritionDaysResponse = paths['/v1/client/nutrition-days']['get']['responses'][200]['content']['application/json'];

export function useSaveNutritionDayMutation() {
  const qc = useQueryClient();

  const invalidate = () => qc.invalidateQueries({queryKey: nutritionDayKeys.lists()});

  return useMutation({
    mutationFn: ({date, ...body}: SaveNutritionDayRequest) =>
      call(client.PATCH('/v1/client/nutrition-days/{date}', {params: {path: {date}}, body})),
    retry: false,
    onSuccess: async (result, {date}) => {
      await qc.cancelQueries({queryKey: nutritionDayKeys.lists()});
      qc.setQueriesData<NutritionDaysResponse>({queryKey: nutritionDayKeys.lists()}, (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          data: current.data.map((day) => (day.date === date ? result.data : day)),
        };
      });
      invalidate();
    },
    onError: invalidate,
  });
}
