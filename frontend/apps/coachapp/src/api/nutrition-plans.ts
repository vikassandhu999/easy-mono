import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {clientKeys, nutritionDayKeys, nutritionKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {paths} from './schema';
import {getSession} from './session';

export type {
  Food,
  NutrientMap,
  NutritionContent,
  NutritionMeal,
  NutritionMealItem,
  NutritionPlan,
  NutritionPortion,
  NutritionTargets,
  Recipe,
} from './schema';
export type NutritionDetails = NonNullable<
  paths['/v1/coach/nutrition-plans']['post']['requestBody']
>['content']['application/json'];
type Assignment = NonNullable<
  paths['/v1/coach/clients/{client_id}/nutrition-plans/{id}/assign']['post']['requestBody']
>['content']['application/json'];
type Write =
  | {kind: 'create'; body: NutritionDetails}
  | {kind: 'details'; id: string; body: NutritionDetails & {expected_revision: number; effective_on?: string}};

export type NutritionPlanFilters = Pick<
  NonNullable<paths['/v1/coach/nutrition-plans']['get']['parameters']['query']>,
  'search' | 'archived'
>;

export function useNutritionTemplates(filters: NutritionPlanFilters) {
  return useInfiniteQuery({
    queryKey: nutritionKeys.infinite(filters),
    queryFn: async ({pageParam, signal}) => {
      const page = await call(
        client.GET('/v1/coach/nutrition-plans', {
          params: {query: {...filters, cursor: pageParam, limit: 20}},
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
    queryClient.invalidateQueries({queryKey: nutritionKeys.coverage(clientId)}),
    queryClient.invalidateQueries({queryKey: nutritionDayKeys.all}),
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

export function useWithdrawNutritionRevision(id: string, clientId?: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: ({revisionId, expectedRevision}: {revisionId: string; expectedRevision: number}) =>
      call(
        client.DELETE('/v1/coach/nutrition-plans/{id}/revisions/{revision_id}', {
          params: {path: {id, revision_id: revisionId}, query: {expected_revision: expectedRevision}},
        }),
      ),
    onSuccess: async (_result, _input, sessionId) => {
      checkSession(sessionId);
      await Promise.all([
        queryClient.invalidateQueries({queryKey: nutritionKeys.detail(id)}),
        queryClient.invalidateQueries({queryKey: nutritionKeys.lists()}),
        ...(clientId ? [invalidateClientNutrition(clientId)] : []),
      ]);
      checkSession(sessionId);
    },
  });
}
