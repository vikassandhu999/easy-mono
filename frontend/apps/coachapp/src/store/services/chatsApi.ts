import {
    type Chat,
    type ChatMessage,
    type ListChatMessagesProps,
    type ListChatMessagesResult,
    type ListChatsProps,
    type ListChatsResult,
    type SendChatMessageProps,
} from '@/api/chats.ts';

import {apiSlice} from './apiSlice';

type ListChatsQueryParams = Omit<ListChatsProps, 'page'> | undefined;

const DEFAULT_PAGE_SIZE = 20;

const buildChatListParams = (queryArg: ListChatsQueryParams, pageParam: number | undefined) => {
    const params: Record<string, unknown> = {
        ...(queryArg ?? {}),
        page_size: DEFAULT_PAGE_SIZE,
    };

    if (pageParam) {
        params.touched_before = pageParam;
    }

    return params;
};

const getNextChatPage = (lastPage: ListChatsResult) => {
    if (lastPage.chats.length < DEFAULT_PAGE_SIZE) {
        return undefined;
    }

    const lastChat = lastPage.chats?.at(-1);
    return lastChat?.last_message_at ? new Date(lastChat.last_message_at).getTime() : undefined;
};

export const chatsApi = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        listChats: build.infiniteQuery<ListChatsResult, ListChatsQueryParams, number | undefined>({
            query: ({queryArg, pageParam}) => ({
                url: '/v1/coach/chats',
                method: 'get',
                params: buildChatListParams(queryArg, pageParam),
            }),
            serializeQueryArgs: ({queryArgs}) => JSON.stringify(queryArgs ?? {}),
            providesTags: (result) => {
                const baseTag = [{type: 'Chats' as const, id: 'LIST'}];

                if (!result) {
                    return baseTag;
                }

                const chats = result.pages.flatMap((page) => page.chats);

                if (chats.length === 0) {
                    return baseTag;
                }

                return [...chats.map((chat) => ({type: 'Chats' as const, id: chat.id})), ...baseTag];
            },
            infiniteQueryOptions: {
                initialPageParam: undefined,
                getNextPageParam: (lastPage) => getNextChatPage(lastPage),
            },
        }),
        getChat: build.query<Chat, string>({
            query: (chatId) => ({
                url: `/v1/coach/chats/${chatId}`,
                method: 'get',
            }),
            providesTags: (_result, _error, chatId) => [{type: 'Chats', id: chatId}],
        }),
        getChatByClientId: build.query<Chat, string>({
            query: (clientId) => ({
                url: `/v1/coach/clients/${clientId}/chat`,
                method: 'get',
            }),
            providesTags: (result) => (result ? [{type: 'Chats', id: result.id}] : []),
        }),
        listChatMessages: build.query<ListChatMessagesResult, {chatId: string; params?: ListChatMessagesProps}>({
            query: ({chatId, params}) => ({
                url: `/v1/coach/chats/${chatId}/messages`,
                method: 'get',
                params,
            }),
            providesTags: (result, _error, {chatId}) => {
                const baseTag = [{type: 'ChatMessages' as const, id: `${chatId}-LIST`}];

                if (!result) {
                    return baseTag;
                }

                return [
                    ...result.messages.map((message) => ({type: 'ChatMessages' as const, id: message.id})),
                    ...baseTag,
                ];
            },
        }),
        sendMessage: build.mutation<ChatMessage, {chatId: string; data: SendChatMessageProps}>({
            query: ({chatId, data}) => ({
                url: `/v1/coach/chats/${chatId}/messages`,
                method: 'post',
                data,
            }),
            invalidatesTags: (_result, _error, {chatId}) => [
                {type: 'ChatMessages', id: `${chatId}-LIST`},
                {type: 'Chats', id: chatId},
                {type: 'Chats', id: 'LIST'},
            ],
        }),
        editMessage: build.mutation<ChatMessage, {chatId: string; data: {message: string}; messageId: string}>({
            query: ({chatId, messageId, data}) => ({
                url: `/v1/coach/chats/${chatId}/messages/${messageId}`,
                method: 'patch',
                data,
            }),
            invalidatesTags: (_result, _error, {chatId, messageId}) => [
                {type: 'ChatMessages', id: messageId},
                {type: 'ChatMessages', id: `${chatId}-LIST`},
            ],
        }),
        deleteMessage: build.mutation<{message: string}, {chatId: string; messageId: string}>({
            query: ({chatId, messageId}) => ({
                url: `/v1/coach/chats/${chatId}/messages/${messageId}`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, {chatId, messageId}) => [
                {type: 'ChatMessages', id: messageId},
                {type: 'ChatMessages', id: `${chatId}-LIST`},
            ],
        }),
        markChatAsRead: build.mutation<{message: string}, string>({
            query: (chatId) => ({
                url: `/v1/coach/chats/${chatId}/mark-read`,
                method: 'post',
            }),
            invalidatesTags: (_result, _error, chatId) => [
                {type: 'Chats', id: chatId},
                {type: 'Chats', id: 'LIST'},
            ],
        }),
    }),
    overrideExisting: false,
});

export const {
    useListChatsInfiniteQuery,
    useGetChatQuery,
    useGetChatByClientIdQuery,
    useListChatMessagesQuery,
    useSendMessageMutation,
    useEditMessageMutation,
    useDeleteMessageMutation,
    useMarkChatAsReadMutation,
} = chatsApi;
