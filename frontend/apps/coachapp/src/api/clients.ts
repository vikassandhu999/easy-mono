import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {clientKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {Client, ClientInvite, paths} from './schema';
import {getSession} from './session';

export type {Client, ClientInvite} from './schema';

export type ClientFilters = Pick<NonNullable<paths['/v1/coach/clients']['get']['parameters']['query']>, 'search'>;

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
  await queryClient.invalidateQueries({queryKey: clientKeys.lists()});
  if (getSession()?.id !== sessionId) {
    throw new Error('Your session changed. Please try again.');
  }
}

export function useInviteClient() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (body: ClientInvite) => call(client.POST('/v1/coach/clients/invite', {body})),
    onSuccess: updateClient,
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
