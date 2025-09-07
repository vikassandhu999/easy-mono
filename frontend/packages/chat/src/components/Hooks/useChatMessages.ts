import {useRef} from 'react';
import {IChatAPI, Message} from '../../types';
import {InfiniteData, useInfiniteQuery} from '@tanstack/react-query';

export const messagesQueryKey = (chatId: string) => ['messages', {chatId}];
export type MessagesQueryData = InfiniteData<{messages: Message[]}>;

export function latestLastSorter(a: Message, b: Message) {
    return a.sent_at.getTime() - b.sent_at.getTime();
}

const LIMIT = 30;

export const useChatMessages = (
    chatId: string,
    chatApi: IChatAPI,
    enabled = true,
) => {
    const lastID = useRef<string | undefined>();
    return useInfiniteQuery<{messages: Message[]}>({
        queryKey: chatApi.getMessagesKeys(chatId),
        queryFn: async ({pageParam}) => {
            const messages = await chatApi.getMessages(chatId, {
                limit: LIMIT,
                lastMessageID: pageParam as string | undefined,
            });
            if (messages.messages.length === LIMIT) {
                lastID.current =
                    messages.messages[messages.messages.length - 1].id;
            } else {
                lastID.current = undefined;
            }
            return {
                messages: messages.messages.sort(latestLastSorter),
            };
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: () => {
            return lastID.current;
        },
        select: (data) => ({
            pages: [...data.pages].reverse(),
            pageParams: [...data.pageParams].reverse(),
        }),
        enabled,
        staleTime: Infinity,
    });
};
