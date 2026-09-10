import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {clientKeys, trainingPlanKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {paths} from './schema';
import {getSession} from './session';

export type {TrainingPlan, TrainingPlanPlannedSet} from './schema';
export type TrainingPlanFilters = Pick<
  NonNullable<paths['/v1/coach/training-plans']['get']['parameters']['query']>,
  'search'
>;
type Assignment = NonNullable<
  paths['/v1/coach/clients/{client_id}/training-plans/{id}/assign']['post']['requestBody']
>['content']['application/json'];

export function useTrainingTemplates(filters: TrainingPlanFilters) {
  return useInfiniteQuery({
    queryKey: trainingPlanKeys.infinite(filters),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/coach/training-plans', {
          params: {query: {...filters, archived: false, cursor: pageParam, limit: 20}},
          signal,
        }),
      ),
    ...cursorPagination,
  });
}

export function useTrainingPlan(id: string) {
  return useQuery({
    queryKey: trainingPlanKeys.detail(id),
    queryFn: ({signal}) => call(client.GET('/v1/coach/training-plans/{id}', {params: {path: {id}}, signal})),
    staleTime: 0,
  });
}

export function useClientTrainingPlans(clientId: string) {
  return useInfiniteQuery({
    queryKey: trainingPlanKeys.forClient(clientId),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/training-plans', {
          params: {path: {client_id: clientId}, query: {cursor: pageParam, limit: 20, status: 'active'}},
          signal,
        }),
      ),
    ...cursorPagination,
  });
}

export function useAssignTrainingPlan(clientId: string, templateId: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (body: Assignment) =>
      call(
        client.POST('/v1/coach/clients/{client_id}/training-plans/{id}/assign', {
          params: {path: {client_id: clientId, id: templateId}},
          body,
        }),
      ),
    onSuccess: async (_result, _input, sessionId) => {
      if (!sessionId || getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
      await Promise.all([
        queryClient.invalidateQueries({queryKey: trainingPlanKeys.forClient(clientId)}),
        queryClient.invalidateQueries({queryKey: clientKeys.detail(clientId)}),
        queryClient.invalidateQueries({queryKey: clientKeys.lists()}),
      ]);
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
    },
    onError: async (_error, _input, sessionId) => {
      if (sessionId && getSession()?.id === sessionId) {
        await queryClient.invalidateQueries({queryKey: trainingPlanKeys.forClient(clientId)});
      }
    },
  });
}
