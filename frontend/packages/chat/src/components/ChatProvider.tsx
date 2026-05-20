import {Alert, Loader, Stack} from '@mantine/core';
import React, {createContext, PropsWithChildren, RefObject, useMemo, useRef} from 'react';
import {Chat, IChatAPI} from '../types';
import {useChat} from './Hooks/useChat';

interface ChatContextValue {
  chatApi: IChatAPI;
  chat: Chat; // Keep as Chat, but ensure consumers handle its potential undefined state from useChat before full context setup
  messageListRef: RefObject<HTMLDivElement>; // More specific type
}

// Initialize with a more type-safe default or allow undefined and check in consumers
export const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export default function ChatProvider({children, chatApi}: PropsWithChildren<{chatApi: IChatAPI}>) {
  const {data: chat, error, isLoading} = useChat(chatApi); // isSuccess is implicitly !isLoading && !error && !!data
  const messageListRef = useRef<HTMLDivElement>(null);

  const contextValue = useMemo(() => {
    if (!chat) {
      return undefined; // chat can be undefined initially
    }
    return {chat, chatApi, messageListRef};
  }, [chat, chatApi]);

  if (isLoading) {
    return (
      <Stack
        h="100dvh"
        justify="center"
        align="center"
        style={{flexGrow: 1}}
      >
        <Loader
          type="dots"
          size="lg"
        />
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack
        h="100dvh"
        justify="center"
        align="center"
        style={{flexGrow: 1}}
        p="md"
      >
        <Alert
          variant="filled"
          color="red"
          title="Error loading chat"
        >
          {(error as Error).message || 'An unknown error occurred.'}
        </Alert>
      </Stack>
    );
  }

  if (chat && contextValue) {
    // Ensure chat and contextValue are defined
    return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
  }

  // Fallback or specific state for when chat is not yet available but not loading/error
  // This case should ideally be handled by the useChat hook's states
  return null;
}
