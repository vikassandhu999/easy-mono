import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {clientKeys, nutritionKeys, workbenchKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {paths} from './schema';
import {getSession} from './session';

export type {
  Food,
  FoodNutrients,
  NutritionMeal,
  NutritionMealItem,
  NutritionMenu,
  NutritionPlan,
  NutritionPortion,
  Recipe,
} from './schema';
export type NutritionDetails = NonNullable<
  paths['/v1/coach/nutrition-plans']['post']['requestBody']
>['content']['application/json'];
export type NutritionMenuBody = NonNullable<
  paths['/v1/coach/nutrition-plans/{id}/menu']['put']['requestBody']
>['content']['application/json'];
type Assignment = NonNullable<
  paths['/v1/coach/clients/{client_id}/nutrition-plans/{id}/assign']['post']['requestBody']
>['content']['application/json'];
type Write =
  | {kind: 'create'; body: NutritionDetails}
  | {kind: 'details'; id: string; body: NutritionDetails & {expected_revision: number}}
  | {kind: 'menu'; id: string; body: NutritionMenuBody};

export function useNutritionTemplates(search: string) {
  return useInfiniteQuery({
    queryKey: nutritionKeys.infinite(search),
    queryFn: async ({pageParam, signal}) => {
      const page = await call(
        client.GET('/v1/coach/nutrition-plans', {
          params: {query: {search, archived: false, cursor: pageParam, limit: 20}},
          signal,
        }),
      );
      return {...page, next_cursor: page.next_cursor ?? null};
    },
    ...cursorPagination,
  });
}
export function useNutritionPlan(id: string) {
  return useQuery({
    queryKey: nutritionKeys.detail(id),
    enabled: Boolean(id),
    staleTime: 0,
    queryFn: ({signal}) => call(client.GET('/v1/coach/nutrition-plans/{id}', {params: {path: {id}}, signal})),
  });
}
export function useNutritionCoverage(clientId: string) {
  return useQuery({
    queryKey: nutritionKeys.coverage(clientId),
    staleTime: 0,
    queryFn: ({signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/nutrition-coverage', {params: {path: {client_id: clientId}}, signal}),
      ),
  });
}
export function usePreviewNutritionMenu() {
  return useMutation({
    mutationFn: (body: Pick<NutritionMenuBody, 'menu'>) =>
      call(client.POST('/v1/coach/nutrition-plans/preview-menu', {body})),
  });
}
function checkSession(id: string | undefined) {
  if (!id || getSession()?.id !== id) {
    throw new Error('Your session changed. Please try again.');
  }
}
export function useSaveNutritionPlan(clientId?: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (input: Write) => {
      switch (input.kind) {
        case 'create':
          return call(client.POST('/v1/coach/nutrition-plans', {body: input.body}));
        case 'details':
          return call(
            client.PATCH('/v1/coach/nutrition-plans/{id}', {params: {path: {id: input.id}}, body: input.body}),
          );
        case 'menu':
          return call(
            client.PUT('/v1/coach/nutrition-plans/{id}/menu', {params: {path: {id: input.id}}, body: input.body}),
          );
      }
    },
    onSuccess: async (result, _input, sessionId) => {
      checkSession(sessionId);
      await Promise.all([
        queryClient.invalidateQueries({queryKey: nutritionKeys.lists()}),
        queryClient.invalidateQueries({queryKey: nutritionKeys.detail(result.data.id)}),
        ...(result.data.client_id ? [invalidateClientNutrition(result.data.client_id)] : []),
      ]);
      checkSession(sessionId);
    },
    onError: async (_error, input, sessionId) => {
      if (sessionId && getSession()?.id === sessionId) {
        await Promise.all([
          queryClient.invalidateQueries({queryKey: nutritionKeys.lists()}),
          ...(clientId ? [invalidateClientNutrition(clientId)] : []),
          ...(input.kind === 'create'
            ? []
            : [queryClient.invalidateQueries({queryKey: nutritionKeys.detail(input.id)})]),
        ]);
      }
    },
  });
}
function invalidateClientNutrition(clientId: string) {
  return Promise.all([
    queryClient.invalidateQueries({queryKey: workbenchKeys.all}),
    queryClient.invalidateQueries({queryKey: nutritionKeys.coverage(clientId)}),
    queryClient.invalidateQueries({queryKey: clientKeys.detail(clientId)}),
    queryClient.invalidateQueries({queryKey: clientKeys.lists()}),
  ]);
}
export function useAssignNutritionPlan(clientId: string, templateId: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (body: Assignment) =>
      call(
        client.POST('/v1/coach/clients/{client_id}/nutrition-plans/{id}/assign', {
          params: {path: {client_id: clientId, id: templateId}},
          body,
        }),
      ),
    onSuccess: async (_result, _input, sessionId) => {
      checkSession(sessionId);
      await Promise.all([
        invalidateClientNutrition(clientId),
        queryClient.invalidateQueries({queryKey: nutritionKeys.lists()}),
      ]);
      checkSession(sessionId);
    },
    onError: async (_error, _input, sessionId) => {
      if (sessionId && getSession()?.id === sessionId) {
        await queryClient.invalidateQueries({queryKey: nutritionKeys.coverage(clientId)});
      }
    },
  });
}
