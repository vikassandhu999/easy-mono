import {IconSend} from '@tabler/icons-react';
import {useQueryClient} from '@tanstack/react-query';
import {create} from 'mutative'; // Assuming 'mutative' is for immutable updates
import React, {RefCallback, useCallback, useContext, useEffect} from 'react';
import {Message} from '../types';
import {ChatContext} from './ChatProvider';
import {latestLastSorter, MessagesQueryData} from './Hooks/useChatMessages';
import Input from './Input'; // Custom Rich Text Input

const ChatFooter = ({footerRef}: {footerRef: RefCallback<HTMLElement>}) => {
  const context = useContext(ChatContext);
  const {chatApi, chat} = context!;

  const queryClient = useQueryClient();

  const onMessageReceived = useCallback(
    (message: Message) => {
      queryClient.setQueryData<MessagesQueryData>(chatApi.getMessagesKeys(chat.id), (oldData) => {
        if (!oldData) {
          // Create initial structure with proper typing
          return {
            pages: [
              {
                messages: [message],
              },
            ],
            pageParams: [undefined],
          };
        }
        return create(oldData, (draft) => {
          if (!draft.pages[0]) {
            draft.pages[0] = {messages: []};
          }
          draft.pages[0].messages.push(message);
          draft.pages[0].messages.sort(latestLastSorter);
        });
      });
    },
    [queryClient, chatApi, chat.id],
  );

  useEffect(() => {
    const unsub = chatApi.onMessage(chat.id, onMessageReceived);
    return () => {
      unsub();
    };
  }, [chat.id, chatApi, onMessageReceived]);

  const handleSendMessage = async (messageContent: {content: string}) => {
    await chatApi.sendMessage(chat.id, messageContent);
  };

  return (
    <div
      ref={footerRef}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        minHeight: '64px', // Mobile-first smaller height
        padding: '8px 12px', // Mobile-first smaller padding
        backgroundColor: 'var(--mantine-color-gray-0)',
        borderTop: '1px solid var(--mantine-color-gray-3)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)', // Subtle shadow for better separation
      }}
    >
      <Input
        sendIcon={
          <IconSend
            size={18} // Smaller icon for mobile
            aria-hidden="true"
          />
        }
        sendMessage={handleSendMessage}
        onTypingStarted={() => {
          chatApi.typingStarted(chat.id);
        }}
        onTypingStopped={() => {
          chatApi.typingStopped(chat.id);
        }}
      />
    </div>
  );
};

export default ChatFooter;
