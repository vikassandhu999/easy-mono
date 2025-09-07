import { Result } from '@/lib/error';
import { authedClient } from './auth';
import { Chat, formatChat, formatMessage, Message } from '@easy/chat';

export interface ListChatMessages {
  messages: Message[];
}

export interface ListChatMessagesRequest {
  chatId: string;
  lastChatMessageId?: string;
  limit: number;
}

export interface ListChatsProps {
  touched_before?: number;
  limit: number;
}

export interface ListChats extends ListChatsProps {
  chats: Chat[];
}

export const ChatAPI = {
  getChat: async (): Promise<Result<Chat>> => {
    try {
      const response = await authedClient.get('/c1/chat');
      return Result.success(formatChat(response.data));
    } catch (error: unknown) {
      return Result.failure(error);
    }
  },
  getChatByClientID: async (id: string): Promise<Result<Chat>> => {
    try {
      const response = await authedClient.get('/v1/clients/' + id + '/chat');
      return Result.success(formatChat(response.data));
    } catch (error: unknown) {
      return Result.failure(error);
    }
  },
  listChats: async (data: ListChatsProps): Promise<Result<ListChats>> => {
    try {
      const response = await authedClient.get('/v1/chats', {
        params: { ...data, touched_before: data.touched_before },
      });
      return Result.success({
        ...response.data,
        chats: response.data.chats.map(formatChat),
      });
    } catch (error: unknown) {
      return Result.failure(error);
    }
  },
  listChatMessages: async (data: ListChatMessagesRequest): Promise<Result<ListChatMessages>> => {
    try {
      const response = await authedClient.get('/c1/chats/' + data.chatId + '/messages', {
        params: {
          ...data,
          last_message_id: data.lastChatMessageId,
        },
      });
      return Result.success({
        ...response.data,
        messages: response.data.messages.map(formatMessage),
      });
    } catch (error: unknown) {
      return Result.failure(error);
    }
  },
};
