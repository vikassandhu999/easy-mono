import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {clientKeys, workbenchKeys} from '@/api/keys';
import type {components} from '@/api/schema';

export type WorkbenchCounts = components['schemas']['WorkbenchCounts'];

export type WorkbenchCountsResponse = {
  data: WorkbenchCounts;
};

export type QueueSnoozeRequest = components['schemas']['QueueSnoozeRequest'];

export function useWorkbenchCountsQuery() {
  return useQuery({
    queryKey: workbenchKeys.counts(),
    queryFn: () => call(client.GET('/v1/coach/workbench')) as Promise<WorkbenchCountsResponse>,
  });
}

export function useSnoozeQueueMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({clientId, ...body}: QueueSnoozeRequest & {clientId: string}) =>
      call(client.PUT('/v1/coach/clients/{id}/queue-snooze', {params: {path: {id: clientId}}, body})),
    // Queue lists and the counts key both live under the client-list prefix.
    onSuccess: () => qc.invalidateQueries({queryKey: clientKeys.lists()}),
  });
}
