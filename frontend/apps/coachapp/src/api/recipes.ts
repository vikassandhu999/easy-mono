import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {nutritionKeys, recipeKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {RecipeCreate, RecipeUpdate} from './schema';
import {getSession} from './session';

export type {Recipe, RecipeCreate, RecipeUpdate} from './schema';

export function useRecipes(search: string) {
  return useInfiniteQuery({
    queryKey: recipeKeys.infinite(search),
    queryFn: async ({pageParam, signal}) => {
      const page = await call(
        client.GET('/v1/coach/nutrition-recipes', {params: {query: {search, cursor: pageParam, limit: 20}}, signal}),
      );
      return {...page, next_cursor: page.next_cursor ?? null};
    },
    ...cursorPagination,
  });
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: recipeKeys.detail(id),
    enabled: Boolean(id),
    staleTime: 0,
    queryFn: ({signal}) => call(client.GET('/v1/coach/nutrition-recipes/{id}', {params: {path: {id}}, signal})),
  });
}
export function useSaveRecipe() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (input: {kind: 'create'; body: RecipeCreate} | {kind: 'update'; id: string; body: RecipeUpdate}) =>
      input.kind === 'create'
        ? call(client.POST('/v1/coach/nutrition-recipes', {body: input.body}))
        : call(client.PATCH('/v1/coach/nutrition-recipes/{id}', {params: {path: {id: input.id}}, body: input.body})),
    onSuccess: async (_result, input, sessionId) => {
      if (!sessionId || getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
      await Promise.all([
        queryClient.invalidateQueries({queryKey: recipeKeys.all}),
        ...(input.kind === 'update' ? [queryClient.invalidateQueries({queryKey: nutritionKeys.all})] : []),
      ]);
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
    },
    onError: async (_error, input, sessionId) => {
      if (sessionId && getSession()?.id === sessionId) {
        await Promise.all([
          queryClient.invalidateQueries({queryKey: recipeKeys.all}),
          ...(input.kind === 'update' ? [queryClient.invalidateQueries({queryKey: nutritionKeys.all})] : []),
        ]);
      }
    },
  });
}
