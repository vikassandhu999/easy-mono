import {api} from '@/api/base';
import type {ChatMessage, ListCoachConversationMessagesApiResponse} from '@/api/generated';
import {coachApi} from '@/api/generated';

export type {ChatMessage, Conversation} from '@/api/generated';

const PAGE_SIZE = 50;

// Cursor-paginated chat history stays hand-written (codegen can't emit
// infiniteQuery — see frontend/AGENTS.md). pageParam is the oldest loaded
// message id; the backend returns messages older than it, ascending.
export const conversationsApi = api.injectEndpoints({
  endpoints: (build) => ({
    conversationMessages: build.infiniteQuery<
      ListCoachConversationMessagesApiResponse,
      {conversationId: string},
      string | undefined
    >({
      query: ({queryArg, pageParam}) => ({
        url: `/v1/coach/conversations/${queryArg.conversationId}/messages`,
        params: {limit: PAGE_SIZE, ...(pageParam && {before: pageParam})},
      }),
      infiniteQueryOptions: {
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.data[0]?.id : undefined),
      },
      providesTags: (_result, _error, arg) => [{type: 'ChatMessage', id: arg.conversationId}],
    }),
  }),
});

const enhanced = coachApi.enhanceEndpoints({
  endpoints: {
    listCoachConversations: {providesTags: [{type: 'Conversation', id: 'LIST'}]},
    getCoachConversation: {providesTags: (_r, _e, arg) => [{type: 'Conversation', id: arg.id}]},
    getCoachClientConversation: {
      providesTags: (result) => (result ? [{type: 'Conversation', id: result.data.id}] : []),
    },
    createCoachConversationMessage: {invalidatesTags: [{type: 'Conversation', id: 'LIST'}]},
    markCoachConversationRead: {
      invalidatesTags: (_r, _e, arg) => [
        {type: 'Conversation', id: 'LIST'},
        {type: 'Conversation', id: arg.id},
      ],
    },
  },
});

/** Append a message to the cached history (no-op if already present, e.g. own send echoed back over the channel). */
export const appendMessageAction = (conversationId: string, message: ChatMessage) =>
  conversationsApi.util.updateQueryData('conversationMessages', {conversationId}, (draft) => {
    const exists = draft.pages.some((page) => page.data.some((m) => m.id === message.id));
    if (!exists) {
      draft.pages[0]?.data.push(message);
    }
  });

export const {
  useListCoachConversationsQuery,
  useGetCoachConversationQuery,
  useGetCoachClientConversationQuery,
  useCreateCoachConversationMessageMutation,
  useMarkCoachConversationReadMutation,
} = enhanced;

export const {useConversationMessagesInfiniteQuery} = conversationsApi;
