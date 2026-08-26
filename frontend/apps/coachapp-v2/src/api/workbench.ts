import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from './client.ts';
import {workbenchKeys} from './keys.ts';
import type {
  CheckInAwaitingReviewReason as CheckInAwaitingReviewReasonSchema,
  EngagementEndingSoonReason as EngagementEndingSoonReasonSchema,
  IntakeOverdueReason as IntakeOverdueReasonSchema,
  InvitationFollowUpDueReason as InvitationFollowUpDueReasonSchema,
  MissedCheckInReason as MissedCheckInReasonSchema,
  ReplyNeededReason as ReplyNeededReasonSchema,
  ServiceCoverageEndingSoonReason as ServiceCoverageEndingSoonReasonSchema,
  ServiceCoverageMissingReason as ServiceCoverageMissingReasonSchema,
  ServiceNeverProgrammedReason as ServiceNeverProgrammedReasonSchema,
  WorkbenchCheckInQueueItem as WorkbenchCheckInQueueItemSchema,
  WorkbenchExpiringQueueItem as WorkbenchExpiringQueueItemSchema,
  WorkbenchOnboardingQueueItem as WorkbenchOnboardingQueueItemSchema,
  WorkbenchProgrammingQueueItem as WorkbenchProgrammingQueueItemSchema,
  WorkbenchQuietQueueItem as WorkbenchQuietQueueItemSchema,
  WorkbenchRepliesQueueItem as WorkbenchRepliesQueueItemSchema,
  Workbench as WorkbenchSchema,
  WorkbenchSnooze,
} from './schema.ts';
import {workbenchMutationTargets} from './workbench-targets.ts';

export type WorkbenchCounts = WorkbenchSchema;
export type WorkbenchCountsResponse = {data: WorkbenchCounts};

export type QueueSnoozeRequest = WorkbenchSnooze;

export type InvitationFollowUpDueReason = InvitationFollowUpDueReasonSchema;
export type IntakeOverdueReason = IntakeOverdueReasonSchema;
export type WorkbenchOnboardingReason = InvitationFollowUpDueReason | IntakeOverdueReason;
export type ServiceNeverProgrammedReason = ServiceNeverProgrammedReasonSchema;
export type ServiceCoverageMissingReason = ServiceCoverageMissingReasonSchema;
export type ServiceCoverageEndingSoonReason = ServiceCoverageEndingSoonReasonSchema;
export type WorkbenchProgrammingReason =
  | ServiceCoverageEndingSoonReason
  | ServiceCoverageMissingReason
  | ServiceNeverProgrammedReason;
export type EngagementEndingSoonReason = EngagementEndingSoonReasonSchema;
export type MissedCheckInReason = MissedCheckInReasonSchema;
export type CheckInAwaitingReviewReason = CheckInAwaitingReviewReasonSchema;
export type ReplyNeededReason = ReplyNeededReasonSchema;

export type WorkbenchOnboardingQueueItem = WorkbenchOnboardingQueueItemSchema;
export type WorkbenchOnboardingQueueResponse = QueueResponse<WorkbenchOnboardingQueueItem>;
export type WorkbenchProgrammingQueueItem = WorkbenchProgrammingQueueItemSchema;
export type WorkbenchProgrammingQueueResponse = QueueResponse<WorkbenchProgrammingQueueItem>;
export type WorkbenchExpiringQueueItem = WorkbenchExpiringQueueItemSchema;
export type WorkbenchExpiringQueueResponse = QueueResponse<WorkbenchExpiringQueueItem>;
export type WorkbenchQuietQueueItem = WorkbenchQuietQueueItemSchema;
export type WorkbenchQuietQueueResponse = QueueResponse<WorkbenchQuietQueueItem>;
export type WorkbenchRepliesQueueItem = WorkbenchRepliesQueueItemSchema;
export type WorkbenchRepliesQueueResponse = QueueResponse<WorkbenchRepliesQueueItem>;
export type WorkbenchCheckInQueueItem = WorkbenchCheckInQueueItemSchema;
export type WorkbenchCheckInQueueResponse = QueueResponse<WorkbenchCheckInQueueItem>;

type QueueResponse<T> = {count: number; data: T[]};

const PAGE_SIZE = 20;

function nextOffset(count: number, lastPageParam: number): number | undefined {
  const next = lastPageParam + PAGE_SIZE;
  return next < count ? next : undefined;
}

export function useWorkbenchCountsQuery() {
  return useQuery({
    queryKey: workbenchKeys.counts(),
    queryFn: () => call(client.GET('/v1/coach/workbench')),
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
      ),
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
      ),
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
      ),
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
      ),
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
      ),
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
      ),
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
