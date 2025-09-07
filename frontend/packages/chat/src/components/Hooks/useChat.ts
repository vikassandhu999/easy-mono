import {Chat, IChatAPI} from '../../types';
import {useQuery} from '@tanstack/react-query';

export const useChat = (chatApi: IChatAPI, enabled = true) => {
    return useQuery<Chat>({
        queryKey: chatApi.getChatKeys(),
        queryFn: () => chatApi.getChat(),
        enabled,
        staleTime: Infinity,
    });
};
