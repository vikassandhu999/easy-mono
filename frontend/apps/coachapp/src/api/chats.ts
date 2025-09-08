import {z} from 'zod';

import {Result} from '@/utils/error.ts';

import {authedClient} from './auth';

// Zod schemas for chat operations
export const ListChats_zod = z.object({
    page: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(50).optional().default(20),
    search_text: z.string().optional(),
    touched_before: z.number().optional(),
});

export const ListChatMessages_zod = z.object({
    last_message_id: z.string().uuid().optional(),
    page: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(100).optional().default(20),
});

export const SendChatMessage_zod = z.object({
    message: z.string().min(1),
    message_type: z.enum(['text', 'image', 'audio', 'video', 'file']).optional().default('text'),
    metadata: z.record(z.any()).optional(),
});

export interface Chat {
    business_id: string;
    chat_type: 'direct' | 'group';
    created_at: string;
    description?: string;
    id: string;
    is_active: boolean;
    last_message_at?: string;
    name?: string;
    participants: ChatParticipant[];
    unread_count?: number;
    updated_at: string;
}
export interface ChatMessage {
    chat_id: string;
    created_at: string;
    id: string;
    is_deleted: boolean;
    is_edited: boolean;
    message: string;
    message_type: 'audio' | 'file' | 'image' | 'text' | 'video';
    metadata?: Record<string, any>;
    replied_to_id?: string;
    sender?: {
        first_name: string;
        id: string;
        last_name: string;
        role: 'client' | 'coach';
    };
    sender_id: string;
    updated_at: string;
}
// Interfaces
export interface ChatParticipant {
    chat_id: string;
    id: string;
    joined_at: string;
    last_read_at?: string;
    role: 'client' | 'coach';
    user_id: string;
}

export type ListChatMessagesProps = z.infer<typeof ListChatMessages_zod>;

export interface ListChatMessagesResult {
    messages: ChatMessage[];
    page: number;
    page_size: number;
    total: number;
}

// Types
export type ListChatsProps = z.infer<typeof ListChats_zod>;

export interface ListChatsResult {
    chats: Chat[];
    page: number;
    page_size: number;
    total: number;
}

export type SendChatMessageProps = z.infer<typeof SendChatMessage_zod>;

export const ChatsAPI = {
    // DELETE /v1/coach/chats/:chatId/messages/:messageId
    deleteMessage: async (chatId: string, messageId: string): Promise<Result<{message: string}>> => {
        try {
            const response = await authedClient.delete(`/v1/coach/chats/${chatId}/messages/${messageId}`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // PATCH /v1/coach/chats/:chatId/messages/:messageId
    editMessage: async (chatId: string, messageId: string, data: {message: string}): Promise<Result<ChatMessage>> => {
        try {
            const response = await authedClient.patch(`/v1/coach/chats/${chatId}/messages/${messageId}`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/chats/:chatId
    getChat: async (chatId: string): Promise<Result<Chat>> => {
        try {
            const response = await authedClient.get(`/v1/coach/chats/${chatId}`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/clients/:clientId/chat
    getChatByClientId: async (clientId: string): Promise<Result<Chat>> => {
        try {
            const response = await authedClient.get(`/v1/coach/clients/${clientId}/chat`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/chats/:chatId/messages
    listChatMessages: async (
        chatId: string,
        params?: ListChatMessagesProps,
    ): Promise<Result<ListChatMessagesResult>> => {
        try {
            const response = await authedClient.get(`/v1/coach/chats/${chatId}/messages`, {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/chats
    listChats: async (params?: ListChatsProps): Promise<Result<ListChatsResult>> => {
        try {
            const response = await authedClient.get('/v1/coach/chats', {
                params,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/coach/chats/:chatId/mark-read
    markChatAsRead: async (chatId: string): Promise<Result<{message: string}>> => {
        try {
            const response = await authedClient.post(`/v1/coach/chats/${chatId}/mark-read`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/coach/chats/:chatId/messages
    sendMessage: async (chatId: string, data: SendChatMessageProps): Promise<Result<ChatMessage>> => {
        try {
            const response = await authedClient.post(`/v1/coach/chats/${chatId}/messages`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
