import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {ApiError, call, client} from './client';
import {workbenchKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {WorkbenchItems, WorkbenchItemsQuery, WorkbenchSnooze} from './schema';
import {getSession} from './session';

export type {WorkbenchSnooze} from './schema';
export type WorkbenchTask = WorkbenchItems['data'][number];
export type WorkbenchView = NonNullable<WorkbenchItemsQuery['view']>;
export type WorkbenchFilters = Pick<WorkbenchItemsQuery, 'search'> & {view: WorkbenchView};

export function useWorkbenchItems(filters: WorkbenchFilters) {
  const query = useInfiniteQuery({
    queryKey: workbenchKeys.infinite(filters),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/coach/workbench/items', {
          params: {query: {...filters, cursor: pageParam, limit: 25, include_count: pageParam === 'start'}},
          signal,
        }),
      ),
    ...cursorPagination,
    staleTime: 0,
    refetchInterval: 60_000,
  });
  return {
    ...query,
    refetch: async (options?: Parameters<typeof query.refetch>[0]) => {
      const [result] = await Promise.all([
        query.refetch(options),
        queryClient.invalidateQueries({queryKey: workbenchKeys.followUps()}),
      ]);
      return result;
    },
  };
}

export function useWorkbenchFollowUps() {
  const query = useQuery({
    queryKey: workbenchKeys.followUps(),
    queryFn: ({signal}) =>
      call(
        client.GET('/v1/coach/workbench/items', {
          params: {query: {view: 'follow-ups', cursor: 'start', limit: 1, include_count: true}},
          signal,
        }),
      ),
    staleTime: 0,
    refetchInterval: 60_000,
  });
  return {...query, refresh: () => queryClient.invalidateQueries({queryKey: workbenchKeys.all})};
}

export function useSnoozeClient(clientId: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async (body: WorkbenchSnooze) => {
      const result = await client.PUT('/v1/coach/clients/{id}/queue-snooze', {params: {path: {id: clientId}}, body});
      if (!result.response.ok) {
        throw new ApiError(result.response.status, result.error);
      }
    },
    onSuccess: async (_result, _body, sessionId) => {
      if (!sessionId || getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
      await queryClient.invalidateQueries({queryKey: workbenchKeys.all});
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
    },
  });
}
