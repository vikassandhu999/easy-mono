import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {foodKeys, nutrientKeys, nutritionWeekKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {FoodCreate, FoodUpdate, paths} from './schema';
import {getSession} from './session';

export type {Food, FoodCreate, FoodUpdate} from './schema';
export type FoodFilters = Pick<NonNullable<paths['/v1/coach/foods']['get']['parameters']['query']>, 'search' | 'kind'>;

export function useFoods(filters: FoodFilters) {
  return useInfiniteQuery({
    queryKey: foodKeys.infinite(filters),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/coach/foods', {
          params: {query: {...filters, cursor: pageParam, limit: 20}},
          signal,
        }),
      ),
    ...cursorPagination,
  });
}

export function useNutrients() {
  return useQuery({
    queryKey: nutrientKeys.list(),
    queryFn: ({signal}) => call(client.GET('/v1/coach/nutrients', {signal})),
  });
}

export function useFood(id: string) {
  return useQuery({
    queryKey: foodKeys.detail(id),
    enabled: Boolean(id),
    staleTime: 0,
    queryFn: ({signal}) => call(client.GET('/v1/coach/foods/{id}', {params: {path: {id}}, signal})),
  });
}

export function useSaveFood() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (input: {kind: 'create'; body: FoodCreate} | {kind: 'update'; id: string; body: FoodUpdate}) =>
      input.kind === 'create'
        ? call(client.POST('/v1/coach/foods', {body: input.body}))
        : call(client.PATCH('/v1/coach/foods/{id}', {params: {path: {id: input.id}}, body: input.body})),
    onSuccess: async (result, _input, sessionId) => {
      if (!sessionId || getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
      await Promise.all([
        queryClient.invalidateQueries({queryKey: foodKeys.detail(result.data.id)}),
        queryClient.invalidateQueries({queryKey: foodKeys.lists()}),
        queryClient.invalidateQueries({queryKey: nutritionWeekKeys.all}),
      ]);
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
    },
    onError: async (_error, input, sessionId) => {
      if (sessionId && getSession()?.id === sessionId) {
        await Promise.all([
          queryClient.invalidateQueries({queryKey: foodKeys.lists()}),
          ...(input.kind === 'update'
            ? [
                queryClient.invalidateQueries({queryKey: foodKeys.detail(input.id)}),
                queryClient.invalidateQueries({queryKey: nutritionWeekKeys.all}),
              ]
            : []),
        ]);
      }
    },
  });
}
