import {useInfiniteQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {nutritionKeys, trainingPlanKeys} from './keys';
import {type CursorPage, cursorPagination} from './pagination';
import type {PlanResource} from './plan-management';
import type {NutritionPlan, paths, TrainingPlan} from './schema';

export type ClientPlan = TrainingPlan | NutritionPlan;
export type ClientPlanFilters = Pick<
  NonNullable<paths['/v1/coach/clients/{client_id}/nutrition-plans']['get']['parameters']['query']>,
  'search' | 'archived'
>;

export function useClientPlanPage(resource: PlanResource, clientId: string, filters: ClientPlanFilters) {
  const keys = resource === 'training' ? trainingPlanKeys : nutritionKeys;
  return useInfiniteQuery({
    queryKey: keys.clientPlans(clientId, filters),
    queryFn: async ({pageParam, signal}): Promise<CursorPage<ClientPlan>> => {
      const path = {client_id: clientId};
      if (resource === 'training') {
        return call(
          client.GET('/v1/coach/clients/{client_id}/training-plans', {
            params: {
              path,
              query: {
                ...(filters.search ? {search: filters.search} : {}),
                ...(filters.archived === undefined ? {} : {status: filters.archived ? 'archived' : 'active'}),
                cursor: pageParam,
                limit: 20,
              },
            },
            signal,
          }),
        );
      }
      return call(
        client.GET('/v1/coach/clients/{client_id}/nutrition-plans', {
          params: {path, query: {...filters, cursor: pageParam, limit: 20}},
          signal,
        }),
      );
    },
    ...cursorPagination,
  });
}
