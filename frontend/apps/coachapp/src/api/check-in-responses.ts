import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {checkInResponseKeys, formKeys, workbenchKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {paths} from './schema';
import {getSession} from './session';

export type {CheckInReview} from './schema';
export type CheckInResponseFilters = Pick<
  NonNullable<paths['/v1/coach/check-ins/submissions']['get']['parameters']['query']>,
  'client_id' | 'reviewed' | 'search'
>;

export function useCheckInResponses(filters: CheckInResponseFilters) {
  return useInfiniteQuery({
    queryKey: checkInResponseKeys.infinite(filters),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/coach/check-ins/submissions', {
          params: {query: {...filters, cursor: pageParam, limit: 20}},
          signal,
        }),
      ),
    ...cursorPagination,
  });
}

export function useCheckInResponse(id: string) {
  return useQuery({
    queryKey: checkInResponseKeys.detail(id),
    queryFn: ({signal}) => call(client.GET('/v1/coach/check-ins/submissions/{id}', {params: {path: {id}}, signal})),
    staleTime: 0,
  });
}

export function useReviewCheckIn(id: string) {
  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({queryKey: workbenchKeys.all}),
      queryClient.invalidateQueries({queryKey: checkInResponseKeys.all}),
      queryClient.invalidateQueries({queryKey: formKeys.all}),
    ]);
  }
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: () => call(client.POST('/v1/coach/form-submissions/{id}/review', {params: {path: {id}}})),
    onSuccess: async (_result, _input, sessionId) => {
      if (!sessionId || getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
      await refresh();
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
    },
    onError: async (_error, _input, sessionId) => {
      if (sessionId && getSession()?.id === sessionId) {
        await refresh();
      }
    },
  });
}
