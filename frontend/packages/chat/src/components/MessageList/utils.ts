import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import LocalizedFormat from 'dayjs/plugin/localizedFormat'; // For more flexible date formatting if needed
import {Message} from '../../types'; // Ensure path is correct

dayjs.extend(LocalizedFormat);
dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// This type is not used in the provided snippet, remove if not needed elsewhere.
// export type FocusedElement = { center?: boolean; element: Element };

type MessageListScrollContext = {
  prevScrollHeight: number;
  prevNbMessages: number;
  messages: Message[];
  selfUserKind: 'coach' | 'client'; // Changed to match the actual type from ChatParticipant
};

export function updateScroll(
  container: HTMLElement,
  {prevScrollHeight, prevNbMessages, messages, selfUserKind}: MessageListScrollContext,
): number {
  const newNbMessages = messages.length;

  // Early return for empty messages
  if (newNbMessages === 0) {
    return container.scrollHeight;
  }

  const lastMessage = messages[newNbMessages - 1];
  const currentScrollHeight = container.scrollHeight;
  const currentScrollTop = container.scrollTop;
  const containerHeight = container.clientHeight;
  const scrollBottomPosition = currentScrollTop + containerHeight;

  // Threshold to determine if user is close enough to the bottom to auto-scroll
  const STICK_TO_BOTTOM_THRESHOLD = 50;

  // More precise scroll position detection
  const distanceFromBottom = currentScrollHeight - scrollBottomPosition;
  const isScrolledToBottom = distanceFromBottom <= STICK_TO_BOTTOM_THRESHOLD;

  // Check if this is the first load (no previous height)
  const isFirstLoad = prevScrollHeight === 0;

  // Check if new messages were added
  const hasNewMessages = newNbMessages > prevNbMessages;
  const addedMessagesCount = newNbMessages - prevNbMessages;

  // Check if content height increased (new messages or resize)
  const heightIncreased = currentScrollHeight > prevScrollHeight;

  // Check if we're loading older messages at the top (infinite scroll)
  const isLoadingOlderMessages = currentScrollTop <= 10 && heightIncreased && hasNewMessages;

  if (isFirstLoad && hasNewMessages) {
    // Initial load: scroll to bottom instantly without visual jump
    container.scrollTop = currentScrollHeight;
  } else if (isLoadingOlderMessages) {
    // Scenario: New messages loaded at the TOP (older messages via infinite scroll)
    // Calculate exact position to maintain user's view
    const heightDifference = currentScrollHeight - prevScrollHeight;
    const targetScrollTop = currentScrollTop + heightDifference;

    // Apply immediately to prevent any visual shift
    container.scrollTop = Math.max(0, targetScrollTop);
  } else if (isScrolledToBottom || (lastMessage?.sender === selfUserKind && hasNewMessages)) {
    // Scenario 1: User is at/near the bottom - auto-scroll to show new messages
    // Scenario 2: Self user sent a new message - always scroll to bottom

    // Use smooth scrolling for single new messages, instant for bulk loads
    const shouldUseSmooth = addedMessagesCount === 1 && !isFirstLoad;

    if (shouldUseSmooth && container.scrollTo) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        container.scrollTo({
          top: currentScrollHeight,
          behavior: 'smooth',
        });
      });
    } else {
      // Instant scroll for bulk loads or fallback
      container.scrollTop = currentScrollHeight;
    }
  }
  // Otherwise: User has scrolled up intentionally - maintain their position

  return currentScrollHeight;
}

/**
 * Utility function to safely scroll to bottom
 * Handles cases where scrollTo is not available (older browsers)
 */
export function scrollToBottom(container: HTMLElement, smooth = false): void {
  if (!container) {
    return;
  }

  const targetTop = container.scrollHeight;

  if (smooth && container.scrollTo) {
    container.scrollTo({
      top: targetTop,
      behavior: 'smooth',
    });
  } else {
    container.scrollTop = targetTop;
  }
}

/**
 * Check if user is at the bottom of the scroll container
 */
export function isAtBottom(container: HTMLElement, threshold = 50): boolean {
  if (!container) {
    return false;
  }

  const {scrollTop, scrollHeight, clientHeight} = container;
  const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

  return distanceFromBottom <= threshold;
}

export const formatTime = (jsDate: Date | string): string => {
  return dayjs(jsDate).format('LT'); // Localized time, e.g., "8:30 PM"
};

export const formatDate = (jsDate: Date | string): string => {
  const date = dayjs(jsDate);
  if (date.isToday()) {
    return 'Today';
  }
  if (date.isYesterday()) {
    return 'Yesterday';
  }
  // Check if in the same week (e.g. "Monday") - requires custom logic or advanced dayjs plugins
  if (dayjs().isSame(date, 'week')) {
    return date.format('dddd'); // e.g. "Monday"
  }
  if (dayjs().isSame(date, 'year')) {
    return date.format('MMMM D'); // e.g. "August 22"
  }
  return date.format('ll'); // Localized date, e.g., "Aug 22, 2023"
};
