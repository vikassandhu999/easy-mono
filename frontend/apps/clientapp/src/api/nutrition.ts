import {onlineManager, useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {ApiError, call, client} from './client';
import {nutritionKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {Day, DaySlotInput, NutritionDaySlot, NutritionPortion} from './schema';
import {getSession} from './session';

export type {
  Day,
  DayEntryInput,
  DaySlotInput,
  Food,
  FoodNutrients,
  NutritionDayOption,
  NutritionDaySlot,
  NutritionPlan,
  NutritionPortion,
  Recipe,
} from './schema';

export function useNutritionDay(date?: string) {
  return useQuery({
    queryKey: nutritionKeys.day(date),
    queryFn: ({signal}) => readDay(date, signal),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

async function readDay(date?: string, signal?: AbortSignal) {
  const result = await call(
    client.GET('/v1/client/nutrition-days', {
      params: {query: date ? {date} : {}},
      ...(signal ? {signal} : {}),
    }),
  );
  const day = result.data[0];
  if (!day) {
    throw new Error('This nutrition day could not be loaded.');
  }
  return {data: day};
}

export function useNutritionPlans(search: string, archived: boolean) {
  return useInfiniteQuery({
    queryKey: nutritionKeys.plans(search, archived),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/client/nutrition-plans', {
          params: {query: {search, archived, cursor: pageParam, limit: 20}},
          signal,
        }),
      ),
    ...cursorPagination,
  });
}

export function useNutritionPlan(id: string) {
  return useQuery({
    queryKey: nutritionKeys.plan(id),
    queryFn: ({signal}) => call(client.GET('/v1/client/nutrition-plans/{id}', {params: {path: {id}}, signal})),
  });
}

export function useFoods(search: string) {
  return useInfiniteQuery({
    queryKey: nutritionKeys.library('food', search),
    queryFn: ({pageParam, signal}) =>
      call(client.GET('/v1/client/nutrition-foods', {params: {query: {search, cursor: pageParam, limit: 20}}, signal})),
    ...cursorPagination,
  });
}

export function useRecipes(search: string) {
  return useInfiniteQuery({
    queryKey: nutritionKeys.library('recipe', search),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/client/nutrition-recipes', {params: {query: {search, cursor: pageParam, limit: 20}}, signal}),
      ),
    ...cursorPagination,
  });
}

export function samePortion(left: NutritionPortion, right: NutritionPortion) {
  return left.kind === 'gram'
    ? right.kind === 'gram' && left.grams === right.grams
    : right.kind === 'serving' &&
        left.amount === right.amount &&
        left.unit === right.unit &&
        left.label === right.label;
}

// Only the immediately following revision can acknowledge this exact operation.
// A later revision or hidden source identity requires a deliberate comparison.
export function mealSaveMatches(input: DaySlotInput, slot: NutritionDaySlot | undefined) {
  if (!slot || slot.revision !== input.expected_revision + 1 || slot.meal_id !== input.meal_id) {
    return false;
  }
  const rows = slot.rows.filter((row) => row.entry_id !== null);
  return (
    rows.length === input.entries.length &&
    input.entries.every((entry) =>
      rows.some(
        (row) =>
          row.entry_id === entry.id &&
          row.planned_item_ref === entry.planned_item_ref &&
          row.food_id === entry.food_id &&
          row.recipe_id === entry.recipe_id &&
          samePortion(row.portion, entry.portion) &&
          row.notes === entry.notes,
      ),
    )
  );
}

export class MealConflict extends Error {
  readonly day: Day;
  constructor(day: Day) {
    super('This meal changed since you opened it. Compare the saved meal with your draft.');
    this.day = day;
  }
}

function requireOwner(owner: string | undefined) {
  if (!owner || getSession()?.id !== owner) {
    throw new Error('Your session changed. Please sign in again.');
  }
}

export function useSaveMeal(date: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async (input: DaySlotInput) => {
      const owner = getSession()?.id;
      if (!onlineManager.isOnline()) {
        throw new Error('Reconnect before saving. Your meal draft is kept on this device.');
      }
      const current = await readDay(date);
      requireOwner(owner);
      const slot = current.data.slots.find((item) => item.meal_slot === input.meal_slot);
      if (mealSaveMatches(input, slot)) {
        return current;
      }
      if ((slot?.revision ?? 0) !== input.expected_revision) {
        throw new MealConflict(current.data);
      }
      try {
        return await call(
          client.PATCH('/v1/client/nutrition-days/{date}', {params: {path: {date}}, body: {slots: [input]}}),
        );
      } catch (error) {
        requireOwner(owner);
        if (!(error instanceof ApiError) || error.status >= 500 || error.status === 409) {
          const saved = await readDay(date);
          requireOwner(owner);
          const savedSlot = saved.data.slots.find((item) => item.meal_slot === input.meal_slot);
          if (mealSaveMatches(input, savedSlot)) {
            return saved;
          }
          if ((savedSlot?.revision ?? 0) !== input.expected_revision) {
            throw new MealConflict(saved.data);
          }
        }
        throw error;
      }
    },
    onSuccess: async (result, _input, owner) => {
      requireOwner(owner);
      queryClient.setQueryData(nutritionKeys.day(date), result);
      await queryClient.invalidateQueries({queryKey: nutritionKeys.all});
      requireOwner(owner);
    },
    onError: async (error, _input, owner) => {
      if (owner && getSession()?.id === owner) {
        if (error instanceof MealConflict) {
          queryClient.setQueryData(nutritionKeys.day(date), {data: error.day});
        }
        await queryClient.invalidateQueries({queryKey: nutritionKeys.day(date)});
      }
    },
  });
}
