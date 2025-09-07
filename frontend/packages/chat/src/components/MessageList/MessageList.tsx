import React, {
    memo,
    useCallback,
    useContext,
    useLayoutEffect,
    useMemo,
    useRef,
    useEffect,
    useState,
} from 'react';
import {ChatContext} from '../ChatProvider';
import {useChatMessages} from '../Hooks/useChatMessages';
import MessageListRow from './MessageListRow';
import {onHitTopOrBottom, useResizeObserver} from '@easy/hooks';
import {updateScroll} from './utils';
import {Loader, Text, Center} from '@mantine/core';
import {IChatAPI} from '../../types';

function MessagesList() {
    const context = useContext(ChatContext);
    const scrollHeightRef = useRef(0);
    const prevNbMessagesRef = useRef(0);
    const [isContentVisible, setIsContentVisible] = useState(false);
    const isInitialLoadRef = useRef(true);

    // All hooks must be called before any conditional returns
    const {data, isSuccess, fetchNextPage, isFetchingNextPage, hasNextPage} =
        useChatMessages(
            context?.chat?.id || '',
            context?.chatApi || ({} as IChatAPI),
        );

    const messages = useMemo(() => {
        if (data) {
            return data.pages.flatMap((page) => page.messages);
        }
        return [];
    }, [data]);

    const syncScrollPosition = useCallback(() => {
        if (!context) return;

        const scrollingContainer = context.messageListRef.current;
        if (!scrollingContainer || !isSuccess) {
            return;
        }

        if (!context.chat || !context.chatApi) {
            return;
        }

        try {
            const me = context.chatApi.getMe(context.chat).kind;
            const isFirstLoad =
                scrollHeightRef.current === 0 && messages.length > 0;

            if (isFirstLoad && isInitialLoadRef.current) {
                setIsContentVisible(false);

                // Use requestAnimationFrame for smoother initial positioning
                requestAnimationFrame(() => {
                    scrollingContainer.scrollTop =
                        scrollingContainer.scrollHeight;
                    scrollHeightRef.current = scrollingContainer.scrollHeight;
                    prevNbMessagesRef.current = messages.length;
                    isInitialLoadRef.current = false;

                    // Show content immediately after scroll is set
                    setIsContentVisible(true);
                });
                return;
            }

            const newScrollHeight = updateScroll(scrollingContainer, {
                prevScrollHeight: scrollHeightRef.current,
                prevNbMessages: prevNbMessagesRef.current,
                messages,
                selfUserKind: me,
            });

            prevNbMessagesRef.current = messages.length;
            scrollHeightRef.current = newScrollHeight;
        } catch (error) {
            console.warn('Error in syncScrollPosition:', error);
            prevNbMessagesRef.current = messages.length;
            scrollHeightRef.current = scrollingContainer.scrollHeight;
            setIsContentVisible(true);
        }
    }, [context, isSuccess, messages]);

    useResizeObserver(syncScrollPosition, context?.messageListRef.current);
    useLayoutEffect(syncScrollPosition, [syncScrollPosition]);

    // Setup infinite scroll
    useLayoutEffect(() => {
        const scrollElement = context?.messageListRef.current;
        if (isSuccess && scrollElement) {
            const cleanup = onHitTopOrBottom(
                scrollElement,
                () => {
                    if (hasNextPage && !isFetchingNextPage) {
                        fetchNextPage();
                    }
                },
                () => {
                    // onHitBottom - no action needed
                },
            );

            return cleanup;
        }
    }, [context, isSuccess, fetchNextPage, hasNextPage, isFetchingNextPage]);

    // Reset state when chat changes
    useEffect(() => {
        if (context?.chat?.id) {
            scrollHeightRef.current = 0;
            prevNbMessagesRef.current = 0;
            setIsContentVisible(false);
            isInitialLoadRef.current = true;
        }
    }, [context?.chat?.id]);

    // Don't render anything until we have a valid context
    if (!context) {
        return (
            <Center style={{height: '100%'}}>
                <Loader size="md" />
            </Center>
        );
    }

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                visibility: isContentVisible ? 'visible' : 'hidden',
                opacity: isContentVisible ? 1 : 0,
                transition: isContentVisible
                    ? 'opacity 0.15s ease-in-out'
                    : 'none',
                minHeight: isContentVisible ? 'auto' : '100vh',
            }}
        >
            <div
                style={{
                    height: '100%',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    scrollBehavior: 'auto',
                }}
                ref={context.messageListRef}
            >
                {isFetchingNextPage && (
                    <Center style={{padding: '1rem'}}>
                        <Loader size="sm" />
                    </Center>
                )}

                {!isSuccess ? (
                    <Center style={{height: '100%'}}>
                        <Loader size="md" />
                    </Center>
                ) : messages.length === 0 ? (
                    <Center style={{height: '100%'}}>
                        <Text c="dimmed">No messages yet</Text>
                    </Center>
                ) : (
                    messages.map((message, index) => {
                        const previous = messages[index - 1];
                        return (
                            <MessageListRow
                                key={`${message.id}-${index}`}
                                message={message}
                                previous={previous}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default memo(MessagesList);
