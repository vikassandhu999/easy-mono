import {z} from 'zod';
import {Result} from '@/Utils/Error';
import {authedClient} from './auth';

// Zod schemas for chat operations
export const ListChats_zod = z.object({
    search_text: z.string().optional(),
    touched_before: z.number().optional(),
    page: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(50).optional().default(20),
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

// Types
export type ListChatsProps = z.infer<typeof ListChats_zod>;
export type ListChatMessagesProps = z.infer<typeof ListChatMessages_zod>;
export type SendChatMessageProps = z.infer<typeof SendChatMessage_zod>;

// Interfaces
export interface ChatParticipant {
    id: string;
    user_id: string;
    chat_id: string;
    role: 'coach' | 'client';
    joined_at: string;
    last_read_at?: string;
}

export interface Chat {
    id: string;
    business_id: string;
    name?: string;
    description?: string;
    chat_type: 'direct' | 'group';
    is_active: boolean;
    last_message_at?: string;
    created_at: string;
    updated_at: string;
    participants: ChatParticipant[];
    unread_count?: number;
}

export interface ChatMessage {
    id: string;
    chat_id: string;
    sender_id: string;
    message: string;
    message_type: 'text' | 'image' | 'audio' | 'video' | 'file';
    metadata?: Record<string, any>;
    is_edited: boolean;
    is_deleted: boolean;
    replied_to_id?: string;
    created_at: string;
    updated_at: string;
    sender?: {
        id: string;
        first_name: string;
        last_name: string;
        role: 'coach' | 'client';
    };
}

export interface ListChatsResult {
    chats: Chat[];
    total: number;
    page: number;
    page_size: number;
}

export interface ListChatMessagesResult {
    messages: ChatMessage[];
    total: number;
    page: number;
    page_size: number;
}

export const ChatsAPI = {
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

    // POST /v1/coach/chats/:chatId/messages
    sendMessage: async (chatId: string, data: SendChatMessageProps): Promise<Result<ChatMessage>> => {
        try {
            const response = await authedClient.post(`/v1/coach/chats/${chatId}/messages`, data);
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

    // DELETE /v1/coach/chats/:chatId/messages/:messageId
    deleteMessage: async (chatId: string, messageId: string): Promise<Result<{message: string}>> => {
        try {
            const response = await authedClient.delete(`/v1/coach/chats/${chatId}/messages/${messageId}`);
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
};
