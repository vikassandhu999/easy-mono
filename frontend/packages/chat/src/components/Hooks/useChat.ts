import {useQuery} from '@tanstack/react-query';
import {Chat, IChatAPI} from '../../types';

export const useChat = (chatApi: IChatAPI, enabled = true) => {
  return useQuery<Chat>({
    queryKey: chatApi.getChatKeys(),
    queryFn: () => chatApi.getChat(),
    enabled,
    staleTime: Infinity,
  });
};
