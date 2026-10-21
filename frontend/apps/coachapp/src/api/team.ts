import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {ApiError, call, client} from './client';
import {teamKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {paths, TeamMember, TeamMemberInvite} from './schema';
import {getSession} from './session';

export type {TeamMember, TeamMemberInvite} from './schema';
export type TeamFilters = Pick<NonNullable<paths['/v1/coach/coaches']['get']['parameters']['query']>, 'q' | 'state'>;
export type TeamAction = {kind: 'resend' | 'revoke' | 'remove'; id: string};

export function useTeam(filters: TeamFilters) {
  return useInfiniteQuery({
    queryKey: teamKeys.infinite(filters),
    queryFn: ({pageParam, signal}) =>
      call(client.GET('/v1/coach/coaches', {params: {query: {...filters, cursor: pageParam, limit: 20}}, signal})),
    ...cursorPagination,
    staleTime: 0,
  });
}
export function useTeamMember(id: string) {
  return useQuery({
    queryKey: teamKeys.detail(id),
    queryFn: ({signal}) => call(client.GET('/v1/coach/coaches/{id}', {params: {path: {id}}, signal})),
    staleTime: 0,
  });
}
function assertSession(sessionId: string | undefined) {
  if (!sessionId || getSession()?.id !== sessionId) {
    throw new Error('Your session changed. Please try again.');
  }
}
async function refreshTeam(result: {data: TeamMember} | null, sessionId: string | undefined) {
  assertSession(sessionId);
  if (result) {
    queryClient.setQueryData(teamKeys.detail(result.data.id), result);
  }
  await queryClient.invalidateQueries();
  assertSession(sessionId);
}
export function useInviteCoach() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (body: TeamMemberInvite) => call(client.POST('/v1/coach/coaches', {body})),
    onSuccess: (result, _input, sessionId) => refreshTeam(result, sessionId),
    onError: async (_error, _body, sessionId) => {
      if (sessionId && sessionId === getSession()?.id) {
        await queryClient.invalidateQueries({queryKey: teamKeys.all});
      }
    },
  });
}
async function changeAccess(action: TeamAction) {
  const params = {path: {id: action.id}};
  switch (action.kind) {
    case 'resend':
      return call(client.POST('/v1/coach/coaches/{id}/invite', {params}));
    case 'revoke':
      return call(client.DELETE('/v1/coach/coaches/{id}', {params}));
    case 'remove':
      return call(client.POST('/v1/coach/coaches/{id}/remove', {params}));
  }
}
async function applyAction(action: TeamAction) {
  const sessionId = getSession()?.id;
  try {
    return await changeAccess(action);
  } catch (error) {
    assertSession(sessionId);
    if (action.kind === 'resend' || (error instanceof ApiError && error.status < 500 && error.status !== 404)) {
      throw error;
    }
    try {
      const result = await call(client.GET('/v1/coach/coaches/{id}', {params: {path: {id: action.id}}}));
      assertSession(sessionId);
      if (action.kind === 'remove' && result.data.state === 'removed') {
        return result;
      }
    } catch (lookupError) {
      assertSession(sessionId);
      if (action.kind === 'revoke' && lookupError instanceof ApiError && lookupError.status === 404) {
        return null;
      }
    }
    throw error;
  }
}
export function useTeamAction() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: applyAction,
    onSuccess: async (result, action, sessionId) => {
      assertSession(sessionId);
      if (action.kind === 'revoke') {
        queryClient.removeQueries({queryKey: teamKeys.detail(action.id)});
      }
      await refreshTeam(action.kind === 'revoke' ? null : result, sessionId);
    },
    onError: async (_error, _action, sessionId) => {
      if (sessionId && sessionId === getSession()?.id) {
        await queryClient.invalidateQueries({queryKey: teamKeys.all});
      }
    },
  });
}
