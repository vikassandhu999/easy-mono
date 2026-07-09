import {api} from '@/api/base';
import type {ChatMessage, ListClientConversationMessagesApiResponse} from '@/api/generated';
import {clientApi} from '@/api/generated';

export type {ChatMessage, Conversation} from '@/api/generated';

const PAGE_SIZE = 50;

export const conversationApi = api.injectEndpoints({
  endpoints: (build) => ({
    clientMessages: build.infiniteQuery<ListClientConversationMessagesApiResponse, void, string | undefined>({
      query: ({pageParam}) => ({
        url: '/v1/client/conversation/messages',
        params: {limit: PAGE_SIZE, ...(pageParam && {before: pageParam})},
      }),
      infiniteQueryOptions: {
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.data[0]?.id : undefined),
      },
      providesTags: [{type: 'ChatMessage', id: 'MINE'}],
    }),
  }),
});

const enhanced = clientApi.enhanceEndpoints({
  endpoints: {
    getClientConversation: {providesTags: [{type: 'Conversation', id: 'LIST'}]},
    createClientConversationMessage: {invalidatesTags: [{type: 'Conversation', id: 'LIST'}]},
    markClientConversationRead: {invalidatesTags: [{type: 'Conversation', id: 'LIST'}]},
  },
});

export const appendClientMessageAction = (message: ChatMessage) =>
  conversationApi.util.updateQueryData('clientMessages', undefined, (draft) => {
    const exists = draft.pages.some((page) => page.data.some((m) => m.id === message.id));
    if (!exists) {
      draft.pages[0]?.data.push(message);
    }
  });

export const {
  useGetClientConversationQuery,
  useCreateClientConversationMessageMutation,
  useMarkClientConversationReadMutation,
} = enhanced;

export const {useClientMessagesInfiniteQuery} = conversationApi;
