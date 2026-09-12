import {useInfiniteQuery, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {trainingSessionKeys} from './keys';
import {cursorPagination} from './pagination';
import type {paths} from './schema';

export type {PerformedSet, Session, SessionPlannedSet, SessionSnapshotExercise} from './schema';
export type SessionFilters = Pick<
  NonNullable<paths['/v1/coach/clients/{client_id}/training-sessions']['get']['parameters']['query']>,
  'from' | 'to' | 'search' | 'state'
>;

export function useTrainingSessions(clientId: string, filters: SessionFilters) {
  return useInfiniteQuery({
    queryKey: trainingSessionKeys.infinite(clientId, filters),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/training-sessions', {
          params: {path: {client_id: clientId}, query: {...filters, cursor: pageParam, limit: 20}},
          signal,
        }),
      ),
    ...cursorPagination,
  });
}

export function useTrainingSession(clientId: string, id: string) {
  return useQuery({
    queryKey: trainingSessionKeys.detail(clientId, id),
    queryFn: ({signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/training-sessions/{id}', {
          params: {path: {client_id: clientId, id}},
          signal,
        }),
      ),
    staleTime: 0,
  });
}
