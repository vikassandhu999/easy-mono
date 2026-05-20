import {useMergedRefs} from '@easy/hooks'; // Assuming this is a utility hook
import {Badge} from '@mantine/core';
import React, {useContext} from 'react';
import {ChatContext} from './ChatProvider';
import {useDateScroll} from './Hooks/useDateScroll';
import MessagesList from './MessageList/MessageList';
import {formatDate} from './MessageList/utils';

interface ChatBodyProps {
  height: number;
  bottomOffset: number;
}

function ChatBody({height, bottomOffset}: ChatBodyProps) {
  const context = useContext(ChatContext);
  const {messageListRef} = context!;

  const {innerRef: dateScrollInnerRef, bubbleRef, ...bubbleDate} = useDateScroll(0); // 0 margin by default
  const innerRef = useMergedRefs(dateScrollInnerRef, messageListRef);

  // For dynamic opacity, consider inline style or a more Tailwind-idiomatic approach if possible
  // If data-time attribute is essential for selection, that's fine.
  // The emotion/css approach is against the project's styling guidelines.
  // Let's try to achieve the opacity effect differently or accept it might need a small inline style if complex.
  // For MVP, the hiding effect might be less critical than consistency.

  // Simpler approach: Conditionally render the date inside MessageListRow if bubble is shown for that date
  // Or, pass opacity style directly via props if needed.
  // For now, removing the complex CSS-in-JS. The useDateScroll hook can provide style for the bubble itself.
  // The hiding of the underlying date badge can be handled by MessageListRow if it knows about the bubble.

  return (
    <main
      style={{
        height: `${height}px`,
        marginBottom: `${bottomOffset}px`,
        position: 'relative',
        width: '100%',
        flexGrow: 1,
        overflowY: 'hidden',
        backgroundColor: 'var(--mantine-color-white)',
        // Mobile-first: ensure proper scrolling behavior
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Date Bubble: Positioned above the list */}
      <div
        ref={bubbleRef}
        style={{
          position: 'absolute',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          zIndex: 10,
          visibility: bubbleDate.showBubble ? 'visible' : 'hidden',
          transition: 'opacity 0.2s ease-in-out, visibility 0.2s ease-in-out',
          opacity: bubbleDate.showBubble ? 1 : 0,
          padding: '8px', // Mobile-friendly padding
          ...(bubbleDate.bubbleDateStyle as React.CSSProperties),
        }}
      >
        <Badge
          variant="light"
          color="blue"
          size="sm" // Smaller badge for mobile
        >
          {bubbleDate.bubbleDate ? formatDate(bubbleDate.bubbleDate) : ''}
        </Badge>
      </div>

      {/* Message List Container */}
      <div
        ref={innerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          padding: '0 8px', // Mobile-first smaller padding
          flexGrow: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollBehavior: 'smooth',
          // Better mobile scrolling
          WebkitOverflowScrolling: 'touch',
          // Add padding bottom for better last message visibility
          paddingBottom: '16px',
        }}
      >
        <MessagesList />
      </div>
    </main>
  );
}

export default ChatBody;
