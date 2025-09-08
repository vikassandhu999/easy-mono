import {InfiniteData, useInfiniteQuery} from '@tanstack/react-query';

import {Chat, ChatsAPI, ListChatsResult} from '@/api/chats.ts';

// Query keys
export const CHATS_QUERY_KEYS = {
    all: ['chats'] as const,
    list: (searchtext: string) => [...CHATS_QUERY_KEYS.lists(), {searchtext}] as const,
    lists: () => [...CHATS_QUERY_KEYS.all, 'list'] as const,
};

export type ChatsQueryData = InfiniteData<ListChatsResult>;

function latestFirstSort(a: Chat, b: Chat) {
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bTime - aTime;
}

const LIMIT = 20;

// List chats with search
export const useChats = (searchtext: string = '', enabled = true) => {
    return useInfiniteQuery<ListChatsResult, Error>({
        enabled,
        gcTime: 1000 * 60 * 30, // 30 minutes
        getNextPageParam: (lastPage) => {
            if (lastPage.chats.length === LIMIT) {
                const lastChat = lastPage.chats?.at(-1);
                return lastChat?.last_message_at ? new Date(lastChat.last_message_at).getTime() : undefined;
            }
            return undefined;
        },
        initialPageParam: undefined,
        queryFn: async ({pageParam}) => {
            const result = await ChatsAPI.listChats({
                page_size: LIMIT,
                search_text: searchtext,
                touched_before: pageParam as number,
            });

            if (result.isError) {
                throw new Error(result.getError().message || 'Failed to load chats');
            }

            const value = result.getValue();
            value.chats.sort(latestFirstSort);
            return value;
        },
        queryKey: CHATS_QUERY_KEYS.list(searchtext),
        retry: (failureCount, error) => {
            // Retry up to 3 times for network errors
            if (failureCount < 3 && error.message?.includes('network')) {
                return true;
            }
            return false;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
