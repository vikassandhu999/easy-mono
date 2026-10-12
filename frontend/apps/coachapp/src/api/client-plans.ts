import {useInfiniteQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {trainingPlanKeys} from './keys';
import {type CursorPage, cursorPagination} from './pagination';
import type {paths, TrainingPlan} from './schema';

export type ClientPlan = TrainingPlan;
export type ClientPlanFilters = Pick<
  NonNullable<paths['/v1/coach/clients/{client_id}/training-plans']['get']['parameters']['query']>,
  'search' | 'status'
>;

export function useClientPlanPage(clientId: string, filters: ClientPlanFilters) {
  return useInfiniteQuery({
    queryKey: trainingPlanKeys.clientPlans(clientId, filters),
    queryFn: async ({pageParam, signal}): Promise<CursorPage<ClientPlan>> => {
      const path = {client_id: clientId};
      return call(
        client.GET('/v1/coach/clients/{client_id}/training-plans', {
          params: {path, query: {...filters, cursor: pageParam, limit: 20}},
          signal,
        }),
      );
    },
    ...cursorPagination,
  });
}
