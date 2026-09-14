import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {ApiError, call, client} from './client';
import {billingKeys, clientKeys, prospectKeys, workbenchKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {Prospect, ProspectEnroll, ProspectUpdate, paths} from './schema';
import {getSession} from './session';

export type {Prospect, ProspectEnroll, ProspectUpdate} from './schema';
export type ProspectFilters = Pick<
  NonNullable<paths['/v1/coach/prospects']['get']['parameters']['query']>,
  'search' | 'status'
>;

export function useProspects(filters: ProspectFilters) {
  return useInfiniteQuery({
    queryKey: prospectKeys.infinite(filters),
    queryFn: ({pageParam, signal}) =>
      call(client.GET('/v1/coach/prospects', {params: {query: {...filters, cursor: pageParam, limit: 20}}, signal})),
    ...cursorPagination,
    staleTime: 0,
  });
}
export function useProspect(id: string) {
  return useQuery({
    queryKey: prospectKeys.detail(id),
    queryFn: ({signal}) => call(client.GET('/v1/coach/prospects/{id}', {params: {path: {id}}, signal})),
    staleTime: 0,
  });
}
function assertSession(id: string | undefined) {
  if (!id || getSession()?.id !== id) {
    throw new Error('Your session changed. Please try again.');
  }
}
async function refreshProspect(result: {data: Prospect}, sessionId: string | undefined) {
  assertSession(sessionId);
  queryClient.setQueryData(prospectKeys.detail(result.data.id), result);
  await queryClient.invalidateQueries({queryKey: prospectKeys.all});
  assertSession(sessionId);
}
async function saveReview({id, body}: {id: string; body: ProspectUpdate}) {
  const sessionId = getSession()?.id;
  const params = {path: {id}};
  try {
    return await call(client.PATCH('/v1/coach/prospects/{id}', {params, body}));
  } catch (error) {
    assertSession(sessionId);
    if (error instanceof ApiError && error.status < 500) {
      throw error;
    }
    try {
      const result = await call(client.GET('/v1/coach/prospects/{id}', {params}));
      assertSession(sessionId);
      if (
        result.data.revision > (body.expected_revision ?? 0) &&
        result.data.status === body.status &&
        (body.notes === undefined || result.data.notes === body.notes)
      ) {
        return result;
      }
    } catch {
      assertSession(sessionId);
    }
    throw error;
  }
}
export function useUpdateProspect() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: saveReview,
    onSuccess: (result, _body, sessionId) => refreshProspect(result, sessionId),
  });
}
async function enrollApplication({id, body}: {id: string; body: ProspectEnroll}) {
  const sessionId = getSession()?.id;
  const params = {path: {id}};
  try {
    return await call(client.POST('/v1/coach/prospects/{id}/enroll', {params, body}));
  } catch (error) {
    assertSession(sessionId);
    if (error instanceof ApiError && error.status < 500) {
      throw error;
    }
    try {
      const result = await call(client.GET('/v1/coach/prospects/{id}', {params}));
      assertSession(sessionId);
      if (result.data.client) {
        return {data: {prospect: result.data, already_enrolled: true}};
      }
    } catch {
      assertSession(sessionId);
    }
    throw error;
  }
}
export function useEnrollProspect() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: enrollApplication,
    onSuccess: async (result, _input, sessionId) => {
      await refreshProspect({data: result.data.prospect}, sessionId);
      await Promise.all([
        queryClient.invalidateQueries({queryKey: clientKeys.all}),
        queryClient.invalidateQueries({queryKey: billingKeys.all}),
        queryClient.invalidateQueries({queryKey: workbenchKeys.all}),
      ]);
      assertSession(sessionId);
    },
  });
}
