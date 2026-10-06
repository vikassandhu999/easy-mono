import {onlineManager, useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {ApiError, call, client} from './client';
import {conversationKeys, nutritionKeys} from './keys';
import {assertMealNameAvailable, findSavedMeal} from './nutrition-meals';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {DiaryMeal, Food, NutritionDay, paths} from './schema';
import {getSession} from './session';

export type {DiaryMeal, Food, NutritionDay, NutritionMeal, NutritionPlan, NutritionPortion, Recipe} from './schema';
export type MealInput =
  paths['/v1/client/nutrition-days/{date}']['patch']['requestBody']['content']['application/json']['meals'][number];
export type EntryInput = MealInput['entries'][number];
export type NutritionSlot = NutritionDay['slots'][number];
export type NutrientMap = Food['nutrients'];

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

export function mealSaveMatches(input: MealInput, meal: DiaryMeal | undefined | null) {
  return meal?.id === input.id && meal.request_id === input.request_id;
}

export class MealConflict extends Error {
  readonly day: NutritionDay;
  constructor(day: NutritionDay) {
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
    networkMode: 'always',
    retry: false,
    onMutate: () => getSession()?.id,
    mutationFn: async (input: MealInput) => {
      const owner = getSession()?.id;
      if (!onlineManager.isOnline()) {
        throw new Error('Reconnect before saving. Your meal draft is kept on this device.');
      }
      const current = await readDay(date);
      requireOwner(owner);
      assertMealNameAvailable(current.data, input);
      const slot = findSavedMeal(current.data, input);
      if (mealSaveMatches(input, slot)) {
        return current;
      }
      if ((slot && slot.id !== input.id) || (slot?.revision ?? 0) !== input.expected_revision) {
        throw new MealConflict(current.data);
      }
      try {
        return await call(
          client.PATCH('/v1/client/nutrition-days/{date}', {params: {path: {date}}, body: {meals: [input]}}),
        );
      } catch (error) {
        requireOwner(owner);
        if (!(error instanceof ApiError) || error.status >= 500 || error.status === 409) {
          const saved = await readDay(date);
          requireOwner(owner);
          assertMealNameAvailable(saved.data, input);
          const savedSlot = findSavedMeal(saved.data, input);
          if (mealSaveMatches(input, savedSlot)) {
            return saved;
          }
          if ((savedSlot && savedSlot.id !== input.id) || (savedSlot?.revision ?? 0) !== input.expected_revision) {
            throw new MealConflict(saved.data);
          }
        }
        throw error;
      }
    },
    onSuccess: async (result, _input, owner) => {
      requireOwner(owner);
      queryClient.setQueryData(nutritionKeys.day(date), result);
      await Promise.all([
        queryClient.invalidateQueries({queryKey: nutritionKeys.all}),
        queryClient.invalidateQueries({queryKey: conversationKeys.all}),
      ]);
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
