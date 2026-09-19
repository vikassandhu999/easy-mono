import {onlineManager, useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {call, callEmpty, client} from './client';
import {weightKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {WeightEntry, WeightEntryCreate, WeightProgressListQuery} from './schema';
import {getSession} from './session';

export type {WeightEntry, WeightProgress} from './schema';
export type WeightFilters = Required<Pick<WeightProgressListQuery, 'from' | 'to' | 'unit'>>;
export type WeightSave = WeightEntryCreate & Required<Pick<WeightEntryCreate, 'expected_entry'>>;

export function useWeightProgress(filters: WeightFilters) {
  return useInfiniteQuery({
    queryKey: weightKeys.infinite(filters),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/client/weight-progress', {params: {query: {...filters, cursor: pageParam, limit: 20}}, signal}),
      ),
    ...cursorPagination,
    staleTime: 0,
  });
}

export function useWeightDay(date: string) {
  return useQuery({
    queryKey: weightKeys.day(date),
    queryFn: ({signal}) => call(client.GET('/v1/client/weight-entry', {params: {query: {date}}, signal})),
    staleTime: 0,
  });
}

function requireOwner(owner: string | undefined) {
  if (!owner || getSession()?.id !== owner) {
    throw new Error('Your session changed. Please sign in again.');
  }
}

function requireOnline() {
  if (!onlineManager.isOnline()) {
    throw new Error('Reconnect before saving.');
  }
}

export function useSaveWeight() {
  const owner = getSession()?.id;
  return useMutation({
    mutationFn: async (body: WeightSave) => {
      requireOwner(owner);
      requireOnline();
      const result = await call(client.POST('/v1/client/weight_entries', {body}));
      requireOwner(owner);
      return result;
    },
    onSuccess: async (result) => {
      requireOwner(owner);
      queryClient.setQueryData(weightKeys.day(result.data.date), result);
      await queryClient.invalidateQueries({queryKey: weightKeys.all});
      requireOwner(owner);
    },
  });
}

export function useDeleteWeight() {
  const owner = getSession()?.id;
  return useMutation({
    mutationFn: async (entry: Pick<WeightEntry, 'id' | 'revision' | 'date'>) => {
      requireOwner(owner);
      requireOnline();
      const result = await callEmpty(
        client.DELETE('/v1/client/weight_entries/{id}', {
          params: {path: {id: entry.id}, query: {expected_revision: entry.revision}},
        }),
      );
      requireOwner(owner);
      return result;
    },
    onSuccess: async (_result, entry) => {
      requireOwner(owner);
      queryClient.removeQueries({queryKey: weightKeys.day(entry.date)});
      await queryClient.invalidateQueries({queryKey: weightKeys.all});
      requireOwner(owner);
    },
  });
}
