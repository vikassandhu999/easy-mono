import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {conversationKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {ChatMessageCoachCreate, ConversationInboxQuery} from './schema';
import {getSession} from './session';

export type {ChatMessage, Conversation} from './schema';
export type ConversationFilters = Pick<ConversationInboxQuery, 'search' | 'status'>;

export function useConversations(filters: ConversationFilters) {
  return useInfiniteQuery({
    queryKey: conversationKeys.infinite(filters),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/coach/conversation-inbox', {
          params: {query: {...filters, cursor: pageParam, limit: 20}},
          signal,
        }),
      ),
    ...cursorPagination,
  });
}

export function useConversation(clientId: string) {
  return useQuery({
    queryKey: conversationKeys.forClient(clientId),
    queryFn: ({signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/conversation', {
          params: {path: {client_id: clientId}},
          signal,
        }),
      ),
    staleTime: 0,
  });
}

export function useMessages(id: string) {
  return useInfiniteQuery({
    queryKey: conversationKeys.history(id),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/coach/conversations/{id}/history', {
          params: {path: {id}, query: {cursor: pageParam, limit: 20}},
          signal,
        }),
      ),
    ...cursorPagination,
    staleTime: 0,
  });
}

type Action = {kind: 'send'; body: ChatMessageCoachCreate} | {kind: 'read'; through: string};
export function useConversationAction(id: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async (action: Action) => {
      if (action.kind === 'send') {
        return call(client.POST('/v1/coach/conversations/{id}/messages', {params: {path: {id}}, body: action.body}));
      }
      if (action.kind === 'read') {
        await call(
          client.POST('/v1/coach/conversations/{id}/read', {params: {path: {id}, query: {through: action.through}}}),
        );
      }
    },
    onSuccess: async (_result, _action, sessionId) => {
      if (!sessionId || getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
      await queryClient.invalidateQueries({queryKey: conversationKeys.all});
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
    },
    onError: async (_error, _action, sessionId) => {
      if (sessionId && getSession()?.id === sessionId) {
        await queryClient.invalidateQueries({queryKey: conversationKeys.all});
      }
    },
  });
}
