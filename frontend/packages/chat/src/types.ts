export type ChatParticipant = {
    id: string;
    name: string;
    kind: 'coach' | 'client';
};

export type Message = {
    id: string;
    chatId: string;
    sender: 'coach' | 'client';
    content: string;
    seen: boolean;
    sent_at: Date;
    deleted: boolean;
};

export type MessageGroup = {
    sender: string;
    firstMessageTimestamp: number;
    lastMessageTimestamp: number;
    messages: Message[];
};

export type Chat = {
    id: string;
    coach: {
        id: string;
        name: string;
    };
    client: {
        id: string;
        name: string;
    };
    latest_message: Message;
    created_at: Date;
    latest_message_at: Date;

    // client defined properties
    typing_text?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatChat(chat: any): Chat {
    return {
        ...chat,
        latest_message_at: new Date(chat.latest_message_at),
        created_at: new Date(chat.created_at),
        most_recent_message: chat.most_recent_message
            ? formatMessage(chat.most_recent_message)
            : undefined,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatMessage(msg: any): Message {
    return {
        ...msg,
        sent_at: new Date(msg.sent_at),
    };
}

export type MessageContent = {
    content: string;
};

export interface IChatAPI {
    getChat(): Promise<Chat>;
    getChatKeys(): (string | object)[];
    getMessages(
        chatId: string,
        params: {lastMessageID?: string; limit: number},
    ): Promise<{messages: Message[]}>;
    getMessagesKeys(chatId: string): (string | object)[];
    getMe(chat: Chat): ChatParticipant;
    getOther(chat: Chat): ChatParticipant;
    sendMessage(
        chatId: string,
        messageContent: MessageContent,
    ): Promise<Message>;
    typingStarted(chatId: string): void;
    typingStopped(chatId: string): void;
    onOtherStartedTyping(chatId: string, callback: () => void): () => void;
    onOtherStoppedTyping(chatId: string, callback: () => void): () => void;
    onMessage(chatId: string, callback: (msg: Message) => void): () => void;
}
