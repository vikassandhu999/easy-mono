import {onlineManager, useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {conversationKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {ChatMessageClientCreate} from './schema';
import {getSession} from './session';

export type {Attachment, ChatMessage, ChatMessageHistory, Conversation} from './schema';
export type MessageSend = ChatMessageClientCreate & {request_id: string};

export function useConversation() {
  return useQuery({
    queryKey: conversationKeys.detail(),
    queryFn: ({signal}) => call(client.GET('/v1/client/conversation', {signal})),
    staleTime: 0,
  });
}

export function useConversationHistory() {
  return useInfiniteQuery({
    queryKey: conversationKeys.history(),
    queryFn: ({pageParam, signal}) =>
      call(client.GET('/v1/client/conversation/history', {params: {query: {cursor: pageParam, limit: 30}}, signal})),
    ...cursorPagination,
    staleTime: 0,
  });
}

function requireOwner(owner: string | undefined) {
  if (!owner || getSession()?.id !== owner) {
    throw new Error('Your session changed. Please sign in again.');
  }
}

function requireOnline() {
  if (!onlineManager.isOnline()) {
    throw new Error('Reconnect before sending.');
  }
}

export function useSendMessage() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async (body: MessageSend) => {
      const owner = getSession()?.id;
      requireOwner(owner);
      requireOnline();
      const result = await call(client.POST('/v1/client/conversation/messages', {body}));
      requireOwner(owner);
      return result;
    },
    onSuccess: async (_result, _input, owner) => {
      requireOwner(owner);
      await queryClient.invalidateQueries({queryKey: conversationKeys.all});
      requireOwner(owner);
    },
  });
}

export function useReadConversation() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async (through: string) => {
      const owner = getSession()?.id;
      requireOwner(owner);
      requireOnline();
      const result = await call(client.POST('/v1/client/conversation/read', {params: {query: {through}}}));
      requireOwner(owner);
      return result;
    },
    onSuccess: async (_result, _input, owner) => {
      requireOwner(owner);
      await queryClient.invalidateQueries({queryKey: conversationKeys.detail()});
      requireOwner(owner);
    },
  });
}
