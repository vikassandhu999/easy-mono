import {useInfiniteQuery, useMutation} from '@tanstack/react-query';
import {call, client} from './client';
import {checkInRequestKeys, clientKeys, formKeys, workbenchKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {CheckInRequest, CheckInRequestListQuery, FormAssignmentUpdate} from './schema';
import {getSession} from './session';

export type {CheckInRequest};
export type RequestFilters = Pick<CheckInRequestListQuery, 'search' | 'status'>;

export function useCheckInRequests(clientId: string, filters: RequestFilters) {
  return useInfiniteQuery({
    queryKey: checkInRequestKeys.infinite(clientId, filters),
    ...cursorPagination,
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/check-in-requests', {
          params: {path: {client_id: clientId}, query: {...filters, cursor: pageParam, limit: 20}},
          signal,
        }),
      ),
  });
}

export function useUpdateCheckInRequest(clientId: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: ({request, body}: {request: CheckInRequest; body: FormAssignmentUpdate}) =>
      call(
        client.PATCH('/v1/coach/form-assignments/{id}', {
          params: {path: {id: request.id}},
          body: {...body, expected_status: request.status},
        }),
      ),
    onSuccess: async (_result, _input, sessionId) => {
      if (!sessionId || sessionId !== getSession()?.id) {
        throw new Error('Your session changed. Please try again.');
      }
      await Promise.all([
        queryClient.invalidateQueries({queryKey: checkInRequestKeys.forClient(clientId)}),
        queryClient.invalidateQueries({queryKey: formKeys.all}),
        queryClient.invalidateQueries({queryKey: clientKeys.all}),
        queryClient.invalidateQueries({queryKey: workbenchKeys.all}),
      ]);
      if (sessionId !== getSession()?.id) {
        throw new Error('Your session changed. Please try again.');
      }
    },
  });
}
