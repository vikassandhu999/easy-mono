import {useContentHeight} from '@easy/hooks'; // Assuming this hook is robust
import React from 'react';
import {IChatAPI} from '../types';
import ChatBody from './ChatBody';
import ChatFooter from './ChatFooter';
import ChatHeader from './ChatHeader';
import ChatProvider from './ChatProvider';
import {DateListProvider} from './DateList'; // Renamed from DateList/index.tsx for clarity

// Interface for chatApi for better type safety if not already globally defined
// export interface IChatAPI { /* ... methods ... */ }

export interface ChatViewProps {
  chatApi: IChatAPI;
}

function ChatView({chatApi}: ChatViewProps) {
  const {contentHeight, bottomHeight, useElementRef} = useContentHeight();

  const headerRef = useElementRef('top'); // Changed 'header' to 'headerRef' for clarity if used as ref
  const footerRef = useElementRef('bottom'); // Changed 'footer' to 'footerRef'

  return (
    <ChatProvider chatApi={chatApi}>
      <ChatHeader headerRef={headerRef} />
      <DateListProvider>
        <ChatBody
          height={contentHeight}
          bottomOffset={bottomHeight}
        />
      </DateListProvider>
      <ChatFooter footerRef={footerRef} />
    </ChatProvider>
  );
}

export default ChatView;
