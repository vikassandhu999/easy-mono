import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {clientKeys, conversationKeys, reviewKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {paths} from './schema';
import {getSession} from './session';

export type ReviewScreen =
  paths['/v1/coach/clients/{client_id}/review-screen']['get']['responses'][200]['content']['application/json']['data'];
export type Review = NonNullable<ReviewScreen['last_review']>;
export type ReviewRosterFilters = Omit<
  NonNullable<paths['/v1/coach/review-roster']['get']['parameters']['query']>,
  'cursor' | 'limit'
>;
export type ReviewWrite = NonNullable<
  paths['/v1/coach/clients/{client_id}/reviews']['post']['requestBody']
>['content']['application/json'];
export type ReviewUpdate = NonNullable<
  paths['/v1/coach/clients/{client_id}/reviews/{id}']['patch']['requestBody']
>['content']['application/json'];
export type ReviewSettingsWrite = NonNullable<
  paths['/v1/coach/review-settings']['patch']['requestBody']
>['content']['application/json'];

export function useReviewRoster(filters: ReviewRosterFilters) {
  return useInfiniteQuery({
    queryKey: reviewKeys.roster(filters),
    queryFn: async ({pageParam, signal}) => {
      const result = await call(
        client.GET('/v1/coach/review-roster', {params: {query: {...filters, cursor: pageParam, limit: 20}}, signal}),
      );
      return result;
    },
    ...cursorPagination,
  });
}
export function useReviewScreen(clientId: string, range: {from?: string; to?: string}) {
  return useQuery({
    queryKey: reviewKeys.screen(clientId, range),
    queryFn: ({signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/review-screen', {
          params: {path: {client_id: clientId}, query: range},
          signal,
        }),
      ),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
}
export function useReviews(clientId: string) {
  return useInfiniteQuery({
    queryKey: reviewKeys.history(clientId),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/reviews', {
          params: {path: {client_id: clientId}, query: {cursor: pageParam, limit: 20}},
          signal,
        }),
      ),
    ...cursorPagination,
  });
}
function assertSession(session: string | undefined) {
  if (!session || session !== getSession()?.id) {
    throw new Error('Your session changed. Please try again.');
  }
}
async function refresh() {
  await Promise.all([
    queryClient.invalidateQueries({queryKey: reviewKeys.all}),
    queryClient.invalidateQueries({queryKey: conversationKeys.all}),
    queryClient.invalidateQueries({queryKey: clientKeys.all}),
  ]);
}
export function useSaveReview(clientId: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (body: ReviewWrite) =>
      call(client.POST('/v1/coach/clients/{client_id}/reviews', {params: {path: {client_id: clientId}}, body})),
    onSuccess: async (_result, _input, session) => {
      assertSession(session);
      await refresh();
      assertSession(session);
    },
  });
}
export function useUpdateReview(clientId: string, id: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (body: ReviewUpdate) =>
      call(
        client.PATCH('/v1/coach/clients/{client_id}/reviews/{id}', {params: {path: {client_id: clientId, id}}, body}),
      ),
    onSuccess: async (_result, _input, session) => {
      assertSession(session);
      await refresh();
      assertSession(session);
    },
  });
}
export function useReviewSettings() {
  return useQuery({
    queryKey: reviewKeys.settings(),
    queryFn: ({signal}) => call(client.GET('/v1/coach/review-settings', {signal})),
  });
}
export function useUpdateReviewSettings() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (body: ReviewSettingsWrite) => call(client.PATCH('/v1/coach/review-settings', {body})),
    onSuccess: async (_result, _input, session) => {
      assertSession(session);
      await refresh();
      assertSession(session);
    },
  });
}
