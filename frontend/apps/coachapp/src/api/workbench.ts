import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {ApiError, call, client} from './client';
import {workbenchKeys} from './keys';
import {type CursorPage, cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {
  WorkbenchCheckInQueueItem,
  WorkbenchExpiringQueueItem,
  WorkbenchOnboardingQueueItem,
  WorkbenchProgrammingQuery,
  WorkbenchProgrammingQueueItem,
  WorkbenchQuietQueueItem,
  WorkbenchRepliesQueueItem,
  WorkbenchSnooze,
} from './schema';
import {getSession} from './session';

export type {Workbench, WorkbenchSnooze} from './schema';
export type WorkbenchTask =
  | {kind: 'onboarding'; id: string; item: WorkbenchOnboardingQueueItem}
  | {kind: 'programming'; id: string; item: WorkbenchProgrammingQueueItem}
  | {kind: 'expiring'; id: string; item: WorkbenchExpiringQueueItem}
  | {kind: 'quiet'; id: string; item: WorkbenchQuietQueueItem}
  | {kind: 'check-ins'; id: string; item: WorkbenchCheckInQueueItem}
  | {kind: 'replies'; id: string; item: WorkbenchRepliesQueueItem};
export type WorkbenchQueue = WorkbenchTask['kind'];
export type WorkbenchFilters = Pick<WorkbenchProgrammingQuery, 'search' | 'service'>;

export function useWorkbench() {
  const query = useQuery({
    queryKey: workbenchKeys.counts(),
    queryFn: ({signal}) => call(client.GET('/v1/coach/workbench', {signal})),
    staleTime: 0,
    refetchInterval: 60_000,
  });
  return {...query, refresh: () => queryClient.invalidateQueries({queryKey: workbenchKeys.all})};
}
export function useWorkbenchQueue(queue: WorkbenchQueue, filters: WorkbenchFilters) {
  return useInfiniteQuery({
    queryKey: workbenchKeys.infinite(queue, filters),
    queryFn: ({pageParam, signal}) => fetchQueue(queue, filters, pageParam, signal),
    ...cursorPagination,
    staleTime: 0,
    refetchInterval: 60_000,
  });
}
async function fetchQueue(
  queue: WorkbenchQueue,
  filters: WorkbenchFilters,
  cursor: string,
  signal: AbortSignal,
): Promise<CursorPage<WorkbenchTask>> {
  const query = {cursor, limit: 20, search: filters.search ?? ''};
  switch (queue) {
    case 'onboarding': {
      const page = await call(client.GET('/v1/coach/workbench/queues/onboarding', {params: {query}, signal}));
      return {
        ...page,
        data: page.data.map((item) => ({id: item.client.id, kind: 'onboarding', item}) satisfies WorkbenchTask),
      };
    }
    case 'programming': {
      const page = await call(
        client.GET('/v1/coach/workbench/queues/programming', {
          params: {query: {...query, service: filters.service ?? 'all'}},
          signal,
        }),
      );
      return {
        ...page,
        data: page.data.map((item) => ({id: item.client.id, kind: 'programming', item}) satisfies WorkbenchTask),
      };
    }
    case 'expiring': {
      const page = await call(client.GET('/v1/coach/workbench/queues/expiring', {params: {query}, signal}));
      return {
        ...page,
        data: page.data.map((item) => ({id: item.client.id, kind: 'expiring', item}) satisfies WorkbenchTask),
      };
    }
    case 'quiet': {
      const page = await call(client.GET('/v1/coach/workbench/queues/quiet', {params: {query}, signal}));
      return {
        ...page,
        data: page.data.map((item) => ({id: item.client.id, kind: 'quiet', item}) satisfies WorkbenchTask),
      };
    }
    case 'check-ins': {
      const page = await call(client.GET('/v1/coach/workbench/queues/check-ins', {params: {query}, signal}));
      return {
        ...page,
        data: page.data.map((item) => ({id: item.submission.id, kind: 'check-ins', item}) satisfies WorkbenchTask),
      };
    }
    case 'replies': {
      const page = await call(client.GET('/v1/coach/workbench/queues/replies', {params: {query}, signal}));
      return {
        ...page,
        data: page.data.map((item) => ({id: item.conversation.id, kind: 'replies', item}) satisfies WorkbenchTask),
      };
    }
  }
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
