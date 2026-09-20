import {onlineManager, useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {ApiError, call, callEmpty, client} from './client';
import {weightKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {WeightEntry, WeightEntryCreate, WeightProgressListQuery} from './schema';
import {getSession} from './session';

export type {WeightEntry, WeightProgress} from './schema';
export type WeightFilters = Required<Pick<WeightProgressListQuery, 'from' | 'to' | 'unit'>>;
export type WeightSave = WeightEntryCreate & Required<Pick<WeightEntryCreate, 'expected_entry'>>;

export class WeightConflict extends Error {
  readonly entry: WeightEntry | null;
  constructor(entry: WeightEntry | null) {
    super('This date changed on another device. Review the saved weight before replacing it.');
    this.entry = entry;
  }
}

export function weightSaveMatches(input: WeightSave, entry: WeightEntry | null) {
  return Boolean(
    entry &&
      entry.date === input.date &&
      Number(entry.value) === input.value &&
      entry.unit === input.unit &&
      (entry.note ?? '') === (input.note ?? ''),
  );
}

function sameEntry(expected: WeightSave['expected_entry'], entry: WeightEntry | null) {
  return expected === null ? entry === null : entry?.id === expected.id && entry.revision === expected.revision;
}

const readDay = (date: string) => call(client.GET('/v1/client/weight-entry', {params: {query: {date}}}));

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
      const current = await readDay(body.date);
      requireOwner(owner);
      if (current.data && weightSaveMatches(body, current.data)) {
        return {data: current.data};
      }
      if (!sameEntry(body.expected_entry, current.data)) {
        throw new WeightConflict(current.data);
      }
      try {
        const result = await call(client.POST('/v1/client/weight_entries', {body}));
        requireOwner(owner);
        return result;
      } catch (error) {
        requireOwner(owner);
        if (!(error instanceof ApiError) || error.status >= 500 || error.status === 409) {
          const saved = await readDay(body.date);
          requireOwner(owner);
          if (saved.data && weightSaveMatches(body, saved.data)) {
            return {data: saved.data};
          }
          if (!sameEntry(body.expected_entry, saved.data)) {
            throw new WeightConflict(saved.data);
          }
        }
        throw error;
      }
    },
    onSuccess: async (result) => {
      requireOwner(owner);
      queryClient.setQueryData(weightKeys.day(result.data.date), result);
      await queryClient.invalidateQueries({queryKey: weightKeys.all});
      requireOwner(owner);
    },
    onError: async (error, body) => {
      if (getSession()?.id === owner && error instanceof WeightConflict) {
        queryClient.setQueryData(weightKeys.day(body.date), {data: error.entry});
        await queryClient.invalidateQueries({queryKey: weightKeys.all});
      }
    },
  });
}

export function useDeleteWeight() {
  const owner = getSession()?.id;
  return useMutation({
    mutationFn: async (entry: Pick<WeightEntry, 'id' | 'revision' | 'date'>) => {
      requireOwner(owner);
      requireOnline();
      const current = await readDay(entry.date);
      requireOwner(owner);
      if (current.data?.id !== entry.id) {
        return;
      }
      if (current.data.revision !== entry.revision) {
        throw new WeightConflict(current.data);
      }
      try {
        await callEmpty(
          client.DELETE('/v1/client/weight_entries/{id}', {
            params: {path: {id: entry.id}, query: {expected_revision: entry.revision}},
          }),
        );
        requireOwner(owner);
      } catch (error) {
        requireOwner(owner);
        const saved = await readDay(entry.date);
        requireOwner(owner);
        if (saved.data?.id !== entry.id) {
          return;
        }
        if (saved.data.revision !== entry.revision) {
          throw new WeightConflict(saved.data);
        }
        throw error;
      }
    },
    onSuccess: async (_result, entry) => {
      requireOwner(owner);
      queryClient.removeQueries({queryKey: weightKeys.day(entry.date)});
      await queryClient.invalidateQueries({queryKey: weightKeys.all});
      requireOwner(owner);
    },
    onError: async (error, entry) => {
      if (getSession()?.id === owner && error instanceof WeightConflict) {
        queryClient.setQueryData(weightKeys.day(entry.date), {data: error.entry});
        await queryClient.invalidateQueries({queryKey: weightKeys.all});
      }
    },
  });
}
