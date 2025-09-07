import {ChatsAPI} from '@/api/chats.ts';
import {useApp} from '@/providers/AppProvider';
import {Chat, IChatAPI, Message, ChatParticipant, ChatView, MessageContent, formatMessage} from '@easy/chat';
import {WebSocketMessage} from '@easy/websocket';
import {useMemo} from 'react';
import {useParams} from 'react-router';

function ChatViewPage() {
    const {chatId} = useParams();
    const {socket} = useApp();

    const chatApi = useMemo<IChatAPI>(() => {
        const api: IChatAPI & {unsubs: (() => void)[]} = {
            unsubs: [],
            getChat: async function (): Promise<Chat> {
                const res = await ChatsAPI.getChat(chatId);
                if (res.isError) {
                    throw res.getError();
                }
                return res.getValue();
            },
            getChatKeys: function (): (string | object)[] {
                return ['chats', chatId];
            },
            getMessages: async function (
                chatId: string,
                params: {
                    lastMessageID?: string;
                    limit: number;
                },
            ): Promise<{messages: Message[]}> {
                const res = await ChatsAPI.listChatMessages(chatId, {
                    last_message_id: params.lastMessageID,
                    page_size: params.limit,
                });
                if (res.isError) {
                    throw res.getError();
                }
                return res.getValue();
            },
            getMessagesKeys: function (chatId: string): (string | object)[] {
                return ['chat-msgs', chatId];
            },
            getMe: function (chat: Chat): ChatParticipant {
                return {kind: 'coach', id: '', name: '', ...(chat.coach || {})};
            },
            getOther: function (chat: Chat): ChatParticipant {
                return {
                    kind: 'client',
                    id: '',
                    name: '',
                    ...(chat.client || {}),
                };
            },
            sendMessage: function (chatId: string, messageContent: MessageContent): Promise<Message> {
                return new Promise<Message>((resolve) => {
                    socket.sendMessage(
                        'message_sent',
                        {chat_id: chatId, content: messageContent.content},
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (msg: WebSocketMessage<any>) => {
                            // TODO: reject when message callback is taking too long.
                            resolve(formatMessage(msg.data.chat_message));
                        },
                    );
                });
            },
            typingStarted: function (chatId: string): void {
                socket.sendMessage(
                    'message_typing_started',
                    {
                        chat_id: chatId,
                    },
                    false,
                );
            },
            typingStopped: function (chatId: string): void {
                socket.sendMessage(
                    'message_typing_stopped',
                    {
                        chat_id: chatId,
                    },
                    false,
                );
            },
            onOtherStartedTyping: function (chatId: string, callback: () => void): () => void {
                const innerCallback = (msg: WebSocketMessage<{sender: string; chat_id: string}>) => {
                    if (msg.event !== 'message_typing_started') return;
                    if (msg.data.chat_id === chatId && msg.data.sender === 'client') {
                        callback();
                    }
                };
                socket.addMessageListener(innerCallback);
                return () => {
                    socket.removeMessageListener(innerCallback);
                };
            },
            onOtherStoppedTyping: function (chatId: string, callback: () => void): () => void {
                const innerCallback = (msg: WebSocketMessage<{sender: string; chat_id: string}>) => {
                    if (msg.event !== 'message_typing_stopped') return;
                    if (msg.data.chat_id === chatId && msg.data.sender === 'client') {
                        callback();
                    }
                };
                socket.addMessageListener(innerCallback);
                return () => {
                    socket.removeMessageListener(innerCallback);
                };
            },
            onMessage: function (chatId: string, callback: (msg: Message) => void): () => void {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const onNewMessage = (msg: WebSocketMessage<any>) => {
                    if (msg.event === 'message_sent' && msg.data.chat_message?.chat_id === chatId) {
                        callback(formatMessage(msg.data.chat_message));
                    }
                };
                socket.addMessageListener(onNewMessage);
                return () => {
                    socket.removeMessageListener(onNewMessage);
                };
            },
        };
        return api;
    }, [chatId, socket]);

    return <ChatView chatApi={chatApi} />;
}

export default ChatViewPage;
