import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {ApiError, call, client} from './client';
import {billingKeys, clientKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {Client, ClientInvite, ClientUpdate, paths} from './schema';
import {getSession} from './session';

export type {Client, ClientInvite, ClientUpdate} from './schema';

export type ClientFilters = Pick<
  NonNullable<paths['/v1/coach/clients']['get']['parameters']['query']>,
  'search' | 'status' | 'stage' | 'assigned_coach_id'
>;

export function useClients(filters: ClientFilters) {
  return useInfiniteQuery({
    queryKey: clientKeys.infinite(filters),
    queryFn: ({pageParam, signal}) =>
      call(client.GET('/v1/coach/clients', {params: {query: {...filters, cursor: pageParam, limit: 20}}, signal})),
    ...cursorPagination,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: ({signal}) => call(client.GET('/v1/coach/clients/{id}', {params: {path: {id}}, signal})),
    staleTime: 0,
  });
}

async function updateClient(result: {data: Client}, _input: unknown, sessionId: string | undefined) {
  if (!sessionId || getSession()?.id !== sessionId) {
    throw new Error('Your session changed. Please try again.');
  }
  queryClient.setQueryData(clientKeys.detail(result.data.id), result);
  await Promise.all([
    queryClient.invalidateQueries({queryKey: clientKeys.lists()}),
    queryClient.invalidateQueries({queryKey: billingKeys.all}),
  ]);
  if (getSession()?.id !== sessionId) {
    throw new Error('Your session changed. Please try again.');
  }
}

export function useInviteClient() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (body: ClientInvite) => call(client.POST('/v1/coach/clients/invite', {body})),
    onSuccess: updateClient,
    onError: async (_error, _input, sessionId) => {
      if (sessionId && getSession()?.id === sessionId) {
        await Promise.all([
          queryClient.invalidateQueries({queryKey: clientKeys.lists()}),
          queryClient.invalidateQueries({queryKey: billingKeys.all}),
        ]);
      }
    },
  });
}

export function useResendClientInvitation() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (id: string) => call(client.POST('/v1/coach/clients/{id}/resend-invite', {params: {path: {id}}})),
    onSuccess: updateClient,
    onError: async (_error, id, sessionId) => {
      if (sessionId && getSession()?.id === sessionId) {
        await queryClient.invalidateQueries({queryKey: clientKeys.detail(id)});
      }
    },
  });
}

export function useUpdateClient(id: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (body: ClientUpdate) => call(client.PATCH('/v1/coach/clients/{id}', {params: {path: {id}}, body})),
    onSuccess: async (result, input, sessionId) => {
      await updateClient(result, input, sessionId);
      if (getSession()?.id === sessionId) {
        await queryClient.invalidateQueries();
      }
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed.');
      }
    },
  });
}

export function useRevokeClientInvitation(id: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async () => {
      const result = await client.DELETE('/v1/coach/clients/{id}', {params: {path: {id}}});
      // A retry after a lost response may find the invitation already removed.
      if (!result.response.ok && result.response.status !== 404) {
        throw new ApiError(result.response.status, result.error);
      }
    },
    onSuccess: async (_result, _input, sessionId) => {
      if (!sessionId || getSession()?.id !== sessionId) {
        throw new Error('Your session changed.');
      }
      queryClient.removeQueries({queryKey: clientKeys.detail(id)});
      await queryClient.invalidateQueries();
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed.');
      }
    },
  });
}

export function useReassignClient(id: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (coachId: string) =>
      call(client.POST('/v1/coach/clients/{id}/reassign', {params: {path: {id}}, body: {coach_id: coachId}})),
    onSuccess: async (result, input, sessionId) => {
      await updateClient(result, input, sessionId);
      await queryClient.invalidateQueries();
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed.');
      }
    },
  });
}
