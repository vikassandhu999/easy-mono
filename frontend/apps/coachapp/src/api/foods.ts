import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {foodKeys, nutritionKeys, recipeKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {FoodCreate, FoodUpdate} from './schema';
import {getSession} from './session';

export type {Food, FoodCreate, FoodUpdate} from './schema';

export function useFoods(search: string) {
  return useInfiniteQuery({
    queryKey: foodKeys.infinite(search),
    queryFn: async ({pageParam, signal}) => {
      const page = await call(
        client.GET('/v1/coach/nutrition-foods', {params: {query: {search, cursor: pageParam, limit: 20}}, signal}),
      );
      return {...page, next_cursor: page.next_cursor ?? null};
    },
    ...cursorPagination,
  });
}

export function useFood(id: string) {
  return useQuery({
    queryKey: foodKeys.detail(id),
    enabled: Boolean(id),
    staleTime: 0,
    queryFn: ({signal}) => call(client.GET('/v1/coach/nutrition-foods/{id}', {params: {path: {id}}, signal})),
  });
}
export function useSaveFood() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (input: {kind: 'create'; body: FoodCreate} | {kind: 'update'; id: string; body: FoodUpdate}) =>
      input.kind === 'create'
        ? call(client.POST('/v1/coach/nutrition-foods', {body: input.body}))
        : call(client.PATCH('/v1/coach/nutrition-foods/{id}', {params: {path: {id: input.id}}, body: input.body})),
    onSuccess: async (_result, input, sessionId) => {
      if (!sessionId || getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
      await Promise.all([
        queryClient.invalidateQueries({queryKey: foodKeys.all}),
        ...(input.kind === 'update'
          ? [
              queryClient.invalidateQueries({queryKey: nutritionKeys.all}),
              queryClient.invalidateQueries({queryKey: recipeKeys.all}),
            ]
          : []),
      ]);
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
    },
    onError: async (_error, input, sessionId) => {
      if (sessionId && getSession()?.id === sessionId) {
        await Promise.all([
          queryClient.invalidateQueries({queryKey: foodKeys.all}),
          ...(input.kind === 'update'
            ? [
                queryClient.invalidateQueries({queryKey: nutritionKeys.all}),
                queryClient.invalidateQueries({queryKey: recipeKeys.all}),
              ]
            : []),
        ]);
      }
    },
  });
}
