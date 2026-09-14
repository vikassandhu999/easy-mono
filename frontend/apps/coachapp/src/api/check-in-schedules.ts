import {useInfiniteQuery, useMutation} from '@tanstack/react-query';
import {call, client} from './client';
import {checkInKeys, formKeys, workbenchKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {CheckInScheduleCreate, CheckInScheduleListQuery, CheckInScheduleUpdate} from './schema';
import {getSession} from './session';

export type {CheckInSchedule, CheckInScheduleCreate, CheckInScheduleUpdate} from './schema';

export type ScheduleFilters = Pick<CheckInScheduleListQuery, 'search' | 'active'>;

export function useCheckInSchedules(clientId: string, filters: ScheduleFilters = {}) {
  return useInfiniteQuery({
    queryKey: checkInKeys.infinite(clientId, filters),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/check-in-schedules', {
          params: {path: {client_id: clientId}, query: {...filters, cursor: pageParam, limit: 20}},
          signal,
        }),
      ),
    ...cursorPagination,
  });
}

export function useSaveCheckInSchedule(clientId: string) {
  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({queryKey: workbenchKeys.all}),
      queryClient.invalidateQueries({queryKey: checkInKeys.forClient(clientId)}),
      queryClient.invalidateQueries({queryKey: formKeys.all}),
    ]);
  }
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (
      input: {kind: 'create'; body: CheckInScheduleCreate} | {kind: 'update'; id: string; body: CheckInScheduleUpdate},
    ) =>
      input.kind === 'create'
        ? call(
            client.POST('/v1/coach/clients/{client_id}/check-in-schedules', {
              params: {path: {client_id: clientId}},
              body: input.body,
            }),
          )
        : call(client.PATCH('/v1/coach/check-in-schedules/{id}', {params: {path: {id: input.id}}, body: input.body})),
    onSuccess: async (_result, _input, sessionId) => {
      if (!sessionId || getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
      await invalidate();
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
    },
    onError: async (_error, _input, sessionId) => {
      if (sessionId && getSession()?.id === sessionId) {
        await invalidate();
      }
    },
  });
}
