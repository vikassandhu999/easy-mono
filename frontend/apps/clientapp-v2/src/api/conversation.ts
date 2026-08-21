import {type InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {conversationKeys} from '@/api/keys';
import {patchQueryData, queryClient} from '@/api/query-client';
import type {components, paths} from '@/api/schema';

export type ChatMessage = components['schemas']['ChatMessage'];
export type Conversation = components['schemas']['Conversation'];
export type CreateMessageBody =
  paths['/v1/client/conversation/messages']['post']['requestBody']['content']['application/json'];

export type ChatMessagesResponse = components['schemas']['ChatMessagesResponse'];

const PAGE_SIZE = 20;

export function useGetClientConversationQuery(options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: conversationKeys.detail(),
    queryFn: () => call(client.GET('/v1/client/conversation')),
    enabled: options?.enabled ?? true,
  });
}

// Cursor-paginated chat history. pageParam is the oldest loaded message id;
// the backend returns messages older than it, ascending.
export function useClientMessagesInfiniteQuery() {
  return useInfiniteQuery({
    queryKey: conversationKeys.messages(),
    queryFn: ({pageParam}) =>
      call(
        client.GET('/v1/client/conversation/messages', {
          params: {query: {limit: PAGE_SIZE, ...(pageParam && {before: pageParam})}},
        }),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.data[0]?.id : undefined),
  });
}

export function useCreateClientConversationMessageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMessageBody) =>
      call(client.POST('/v1/client/conversation/messages', {body})),
    // Only the header — the sent message is appended optimistically by the caller.
    onSuccess: () => {
      qc.invalidateQueries({queryKey: conversationKeys.detail()});
    },
  });
}

export function useMarkClientConversationReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => call(client.POST('/v1/client/conversation/read')),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: conversationKeys.detail()});
    },
  });
}

/** Append a message to the cached history (no-op if already present, e.g. own send echoed back over the channel). */
export function appendClientMessage(message: ChatMessage) {
  const cached = queryClient.getQueryData<InfiniteData<ChatMessagesResponse>>(conversationKeys.messages());
  if (!cached) {
    // Nothing cached to append to — a later mount will fetch fresh history.
    return;
  }
  patchQueryData<InfiniteData<ChatMessagesResponse>>(conversationKeys.messages(), (draft) => {
    const exists = draft.pages.some((page) => page.data.some((m) => m.id === message.id));
    if (!exists) {
      draft.pages[0]?.data.push(message);
    }
  });
}
