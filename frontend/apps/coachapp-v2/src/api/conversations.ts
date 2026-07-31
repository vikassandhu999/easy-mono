import {type InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {conversationKeys} from '@/api/keys';
import {patchQueryData, queryClient} from '@/api/query-client';
import type {components, paths} from '@/api/schema';

export type ChatMessage = components['schemas']['ChatMessage'];
export type ChatMessageEmbed = components['schemas']['ChatMessageEmbed'];
export type ChatMessageEmbedRequest = components['schemas']['ChatMessageEmbedRequest'];
export type Conversation = components['schemas']['Conversation'];

type MessagesPage = {data: ChatMessage[]; has_more: boolean};

const PAGE_SIZE = 50;

export function useListCoachConversationsQuery() {
  return useQuery({
    queryKey: conversationKeys.list(),
    // Flat first-100 inbox — the backend caps limit at 100 and no coach is
    // expected to exceed it (same assumption as the old RTK endpoint).
    queryFn: () => call(client.GET('/v1/coach/conversations', {params: {query: {limit: 100}}})),
  });
}

export function useGetCoachConversationQuery(id: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: conversationKeys.detail(id),
    queryFn: () => call(client.GET('/v1/coach/conversations/{id}', {params: {path: {id}}})),
    enabled: options?.enabled ?? true,
  });
}

export function useGetCoachClientConversationQuery(clientId: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: conversationKeys.forClient(clientId),
    queryFn: () =>
      call(client.GET('/v1/coach/clients/{client_id}/conversation', {params: {path: {client_id: clientId}}})),
    enabled: options?.enabled ?? true,
  });
}

// Cursor-paginated chat history. pageParam is the oldest loaded message id;
// the backend returns messages older than it, ascending.
export function useConversationMessagesInfiniteQuery(conversationId: string) {
  return useInfiniteQuery({
    queryKey: conversationKeys.messages(conversationId),
    queryFn: ({pageParam}) =>
      call(
        client.GET('/v1/coach/conversations/{id}/messages', {
          params: {
            path: {id: conversationId},
            query: {limit: PAGE_SIZE, ...(pageParam && {before: pageParam})},
          },
        }),
      ) as Promise<MessagesPage>,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.data[0]?.id : undefined),
  });
}

export type CreateMessageBody =
  paths['/v1/coach/conversations/{id}/messages']['post']['requestBody']['content']['application/json'];

export function useCreateCoachConversationMessageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, body}: {id: string; body: CreateMessageBody}) =>
      call(client.POST('/v1/coach/conversations/{id}/messages', {params: {path: {id}}, body})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: conversationKeys.lists()});
    },
  });
}

export function useMarkCoachConversationReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call(client.POST('/v1/coach/conversations/{id}/read', {params: {path: {id}}})),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({queryKey: conversationKeys.lists()});
      qc.invalidateQueries({queryKey: conversationKeys.detail(id)});
      // The client screen's unread badge reads the client-scoped record, and
      // this mutation only knows the conversation id — invalidate the prefix.
      qc.invalidateQueries({queryKey: conversationKeys.forClients()});
    },
  });
}

/** Append a message to the cached history (no-op if already present, e.g. own send echoed back over the channel). */
export function appendMessage(conversationId: string, message: ChatMessage) {
  const cached = queryClient.getQueryData<InfiniteData<MessagesPage>>(conversationKeys.messages(conversationId));
  if (!cached) {
    // Nothing cached to append to — a later mount will fetch fresh history.
    return;
  }
  patchQueryData<InfiniteData<MessagesPage>>(conversationKeys.messages(conversationId), (draft) => {
    const exists = draft.pages.some((page) => page.data.some((m) => m.id === message.id));
    if (!exists) {
      draft.pages[0]?.data.push(message);
    }
  });
}
