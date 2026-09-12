import {useInfiniteQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {weightProgressKeys} from './keys';
import {cursorPagination} from './pagination';
import type {WeightProgressListQuery} from './schema';

export type {WeightEntry, WeightProgress} from './schema';
export type WeightProgressFilters = Pick<WeightProgressListQuery, 'from' | 'to' | 'unit'>;

export function useWeightProgress(clientId: string, filters: WeightProgressFilters) {
  return useInfiniteQuery({
    queryKey: weightProgressKeys.infinite(clientId, filters),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/weight-progress', {
          params: {path: {client_id: clientId}, query: {...filters, cursor: pageParam, limit: 20}},
          signal,
        }),
      ),
    ...cursorPagination,
  });
}
