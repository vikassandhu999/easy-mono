import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {workbenchKeys} from '@/api/keys';
import type {components} from '@/api/schema';
import {workbenchMutationTargets} from '@/api/workbench-targets';

export type WorkbenchCounts = components['schemas']['WorkbenchCounts'];

export type WorkbenchCountsResponse = {
  data: WorkbenchCounts;
};

export type QueueSnoozeRequest = components['schemas']['QueueSnoozeRequest'];

export type WorkbenchOnboardingQueueItem = components['schemas']['WorkbenchOnboardingQueueItem'];
export type WorkbenchProgrammingQueueItem = components['schemas']['WorkbenchProgrammingQueueItem'];
export type WorkbenchExpiringQueueItem = components['schemas']['WorkbenchExpiringQueueItem'];
export type WorkbenchQuietQueueItem = components['schemas']['WorkbenchQuietQueueItem'];
export type WorkbenchRepliesQueueItem = components['schemas']['WorkbenchRepliesQueueItem'];
export type WorkbenchCheckInQueueItem = components['schemas']['WorkbenchCheckInQueueItem'];

type QueuePage<T> = {count: number; data: T[]};

const PAGE_SIZE = 20;

function nextOffset(count: number, lastPageParam: number): number | undefined {
  const next = lastPageParam + PAGE_SIZE;
  return next < count ? next : undefined;
}

export function useWorkbenchCountsQuery() {
  return useQuery({
    queryKey: workbenchKeys.counts(),
    queryFn: () => call(client.GET('/v1/coach/workbench')) as Promise<WorkbenchCountsResponse>,
  });
}

export function useOnboardingQueueInfiniteQuery() {
  return useInfiniteQuery({
    queryKey: workbenchKeys.queue('onboarding'),
    queryFn: ({pageParam}) =>
      call(
        client.GET('/v1/coach/workbench/queues/onboarding', {
          params: {query: {limit: PAGE_SIZE, offset: pageParam}},
        }),
      ) as Promise<QueuePage<WorkbenchOnboardingQueueItem>>,
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) => nextOffset(lastPage.count, lastPageParam),
  });
}

export function useProgrammingQueueInfiniteQuery(service: 'all' | 'nutrition' | 'training' = 'all') {
  return useInfiniteQuery({
    queryKey: workbenchKeys.queue('programming', {service}),
    queryFn: ({pageParam}) =>
      call(
        client.GET('/v1/coach/workbench/queues/programming', {
          params: {query: {limit: PAGE_SIZE, offset: pageParam, service}},
        }),
      ) as Promise<QueuePage<WorkbenchProgrammingQueueItem>>,
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) => nextOffset(lastPage.count, lastPageParam),
  });
}

export function useExpiringQueueInfiniteQuery() {
  return useInfiniteQuery({
    queryKey: workbenchKeys.queue('expiring'),
    queryFn: ({pageParam}) =>
      call(
        client.GET('/v1/coach/workbench/queues/expiring', {
          params: {query: {limit: PAGE_SIZE, offset: pageParam}},
        }),
      ) as Promise<QueuePage<WorkbenchExpiringQueueItem>>,
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) => nextOffset(lastPage.count, lastPageParam),
  });
}

export function useQuietQueueInfiniteQuery() {
  return useInfiniteQuery({
    queryKey: workbenchKeys.queue('quiet'),
    queryFn: ({pageParam}) =>
      call(
        client.GET('/v1/coach/workbench/queues/quiet', {
          params: {query: {limit: PAGE_SIZE, offset: pageParam}},
        }),
      ) as Promise<QueuePage<WorkbenchQuietQueueItem>>,
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) => nextOffset(lastPage.count, lastPageParam),
  });
}

export function useRepliesQueueInfiniteQuery() {
  return useInfiniteQuery({
    queryKey: workbenchKeys.queue('replies'),
    queryFn: ({pageParam}) =>
      call(
        client.GET('/v1/coach/workbench/queues/replies', {
          params: {query: {limit: PAGE_SIZE, offset: pageParam}},
        }),
      ) as Promise<QueuePage<WorkbenchRepliesQueueItem>>,
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) => nextOffset(lastPage.count, lastPageParam),
  });
}

export function useCheckInsQueueInfiniteQuery() {
  return useInfiniteQuery({
    queryKey: workbenchKeys.queue('check-ins'),
    queryFn: ({pageParam}) =>
      call(
        client.GET('/v1/coach/workbench/queues/check-ins', {
          params: {query: {limit: PAGE_SIZE, offset: pageParam}},
        }),
      ) as Promise<QueuePage<WorkbenchCheckInQueueItem>>,
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) => nextOffset(lastPage.count, lastPageParam),
  });
}

export function useSnoozeQueueMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({clientId, ...body}: QueueSnoozeRequest & {clientId: string}) =>
      call(client.PUT('/v1/coach/clients/{id}/queue-snooze', {params: {path: {id: clientId}}, body})),
    onSuccess: () => {
      for (const queryKey of workbenchMutationTargets().afterSnooze) {
        qc.invalidateQueries({queryKey: [...queryKey]});
      }
    },
  });
}
