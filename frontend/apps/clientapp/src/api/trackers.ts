import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {ApiError, call, callEmpty, client} from './client';
import {trackerKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {paths} from './schema';
import {getSession} from './session';

export type {Tracker, TrackerAssignment, TrackerEntry, TrackerMetrics} from './schema';
export type TrackerInput = paths['/v1/client/tracker-entries']['post']['requestBody']['content']['application/json'];
export type TrackerCorrection =
  paths['/v1/client/tracker-entries/{id}']['patch']['requestBody']['content']['application/json'];
export type TrackerEvent = Required<
  Pick<NonNullable<paths['/v1/client/tracker-prompts']['get']['parameters']['query']>, 'about_session_id'>
>;
export function useTrackers(search: string, archived = false) {
  return useInfiniteQuery({
    queryKey: trackerKeys.library(search, archived),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/client/trackers', {params: {query: {search, archived, cursor: pageParam, limit: 20}}, signal}),
      ),
    ...cursorPagination,
  });
}
export function useTracker(id: string) {
  return useQuery({
    queryKey: trackerKeys.detail(id),
    queryFn: ({signal}) => call(client.GET('/v1/client/trackers/{id}', {params: {path: {id}}, signal})),
  });
}
export function useTrackerToday() {
  return useQuery({
    queryKey: trackerKeys.today(),
    queryFn: ({signal}) => call(client.GET('/v1/client/tracker-today', {signal})),
  });
}
export function readTrackerPrompts(event: TrackerEvent) {
  return call(client.GET('/v1/client/tracker-prompts', {params: {query: event}}));
}
export function useTrackerPrompts(event: TrackerEvent, enabled: boolean) {
  return useQuery({queryKey: trackerKeys.prompts(event), queryFn: () => readTrackerPrompts(event), enabled});
}
export function useTrackerEntries(id: string, from: string, to: string) {
  return useInfiniteQuery({
    queryKey: trackerKeys.entries(id, from, to),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/client/tracker-entries', {
          params: {query: {tracker_id: id, from, to, cursor: pageParam, limit: 20}},
          signal,
        }),
      ),
    ...cursorPagination,
  });
}
export function useTrackerMetrics(id: string, from: string, to: string) {
  return useQuery({
    queryKey: trackerKeys.metrics(id, from, to),
    queryFn: ({signal}) =>
      call(client.GET('/v1/client/trackers/{id}/metrics', {params: {path: {id}, query: {from, to}}, signal})),
  });
}
export function useSaveTracker() {
  return useMutation({
    networkMode: 'always',
    retry: false,
    onMutate: () => getSession()?.id,
    mutationFn: (operation: {input: TrackerInput; id?: string; revision?: number}) => {
      if (operation.id) {
        const {tracker_id: _trackerId, ...input} = operation.input;
        return call(
          client.PATCH('/v1/client/tracker-entries/{id}', {
            params: {path: {id: operation.id}},
            body: {...input, expected_revision: operation.revision ?? 1},
          }),
        );
      }
      return call(client.POST('/v1/client/tracker-entries', {body: operation.input}));
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 409) {
        await queryClient.invalidateQueries({queryKey: trackerKeys.all});
      }
    },
    onSuccess: async (_result, _input, owner) => {
      if (getSession()?.id === owner) {
        await queryClient.invalidateQueries({queryKey: trackerKeys.all});
      }
    },
  });
}
export function useRemoveTrackerEntry() {
  return useMutation({
    networkMode: 'always',
    retry: false,
    mutationFn: ({id, revision}: {id: string; revision: number}) =>
      callEmpty(
        client.DELETE('/v1/client/tracker-entries/{id}', {params: {path: {id}, query: {expected_revision: revision}}}),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: trackerKeys.all});
    },
  });
}
