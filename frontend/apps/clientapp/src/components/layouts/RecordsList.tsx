import React, {useCallback, useEffect, useRef} from 'react';
import {Stack, Button, Center, Loader, Transition, Text} from '@mantine/core';
import {useIntersection} from '@mantine/hooks';

interface RecordsListProps<T> {
    records: T[];
    hasNextPage?: boolean;
    fetchNextPage: () => void;
    isFetchingNextPage?: boolean;
    isLoading?: boolean;
    emptyState: React.ReactNode;
    loadMoreText?: string;
    itemKey?: (item: T, index: number) => string | number;
    renderItem: (item: T, index: number) => React.ReactNode;
    enableInfiniteScroll?: boolean;
    gap?: number | string;
    className?: string;
    onItemClick?: (item: T) => void;
    testId?: string;
    error?: Error | null;
    retryOnError?: boolean;
}

// Memoized item wrapper to prevent unnecessary re-renders
const RecordItem = React.memo(
    <T,>({
        item,
        index,
        renderItem,
        onClick,
    }: {
        item: T;
        index: number;
        renderItem: (item: T, index: number) => React.ReactNode;
        onClick?: (item: T) => void;
    }) => {
        const handleClick = useCallback(() => {
            onClick?.(item);
        }, [item, onClick]);

        return (
            <div
                onClick={onClick ? handleClick : undefined}
                style={onClick ? {cursor: 'pointer'} : undefined}
                role={onClick ? 'button' : undefined}
                tabIndex={onClick ? 0 : undefined}
                onKeyDown={
                    onClick
                        ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleClick();
                              }
                          }
                        : undefined
                }
            >
                {renderItem(item, index)}
            </div>
        );
    },
);

RecordItem.displayName = 'RecordItem';

export default function RecordsList<T>({
    fetchNextPage,
    hasNextPage = false,
    isFetchingNextPage = false,
    isLoading = false,
    renderItem,
    records,
    emptyState,
    loadMoreText = 'Load More',
    itemKey = (item: T, index: number) => {
        return (item as any).id ?? index;
    },
    enableInfiniteScroll = true,
    gap = 'sm',
    className,
    onItemClick,
    testId = 'records-list',
    error = null,
    retryOnError = true,
}: RecordsListProps<T>) {
    // Use refs to track state across renders
    const lastCallTimeRef = useRef(0);
    const hasMountedRef = useRef(false);

    // Use a more reliable intersection observer with smaller rootMargin
    const {ref, entry} = useIntersection({
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
    });

    // Fixed infinite scroll handler with throttling
    const handleFetchNextPage = useCallback(() => {
        const now = Date.now();
        // Prevent multiple calls within 500ms
        if (now - lastCallTimeRef.current > 500) {
            lastCallTimeRef.current = now;
            fetchNextPage();
        }
    }, [fetchNextPage]);

    // Set up intersection observer effect
    useEffect(() => {
        // Only run after initial render and when component is fully mounted
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            return;
        }

        // Check if we should fetch more data
        if (enableInfiniteScroll && entry?.isIntersecting && hasNextPage && !isLoading && !isFetchingNextPage) {
            handleFetchNextPage();
        }
    }, [entry?.isIntersecting, enableInfiniteScroll, hasNextPage, isLoading, isFetchingNextPage, handleFetchNextPage]);

    // Show loading state for initial load
    if (isLoading && records.length === 0) {
        return (
            <Center
                py="xl"
                data-testid={`${testId}-loading`}
            >
                <Loader size="md" />
            </Center>
        );
    }

    // Show empty state
    if (!isLoading && records.length === 0) {
        return (
            <Transition
                mounted={true}
                transition="fade"
                duration={200}
                timingFunction="ease"
            >
                {(styles) => (
                    <div
                        style={styles}
                        data-testid={`${testId}-empty`}
                    >
                        {emptyState}
                    </div>
                )}
            </Transition>
        );
    }

    // Error state with retry button
    if (error && records.length === 0) {
        return (
            <Center
                py="xl"
                data-testid={`${testId}-error`}
            >
                <Stack align="center">
                    <Text c="dimmed">Failed to load data</Text>
                    {retryOnError && (
                        <Button
                            variant="outline"
                            onClick={handleFetchNextPage}
                            size="sm"
                        >
                            Retry
                        </Button>
                    )}
                </Stack>
            </Center>
        );
    }

    return (
        <Stack
            gap={gap}
            className={className}
            data-testid={testId}
        >
            {/* Records list */}
            {records.map((record, index) => (
                <RecordItem
                    key={itemKey(record, index)}
                    item={record}
                    index={index}
                    renderItem={renderItem}
                    onClick={onItemClick}
                />
            ))}

            {/* Better positioned infinite scroll trigger */}
            {hasNextPage &&
                (enableInfiniteScroll ? (
                    <div
                        ref={ref}
                        style={{height: 10, margin: '10px 0'}}
                        data-testid={`${testId}-trigger`}
                    />
                ) : (
                    <Center py="md">
                        <Button
                            onClick={handleFetchNextPage}
                            loading={isFetchingNextPage}
                            disabled={isFetchingNextPage}
                            variant="outline"
                            size="md"
                            data-testid={`${testId}-load-more`}
                        >
                            {loadMoreText}
                        </Button>
                    </Center>
                ))}

            {/* Loading indicator for next page */}
            {isFetchingNextPage && (
                <Center py="md">
                    <Loader size="sm" />
                </Center>
            )}

            {/* Error indicator for pagination errors with retry */}
            {error && records.length > 0 && hasNextPage && (
                <Center py="md">
                    <Button
                        variant="subtle"
                        color="red"
                        onClick={handleFetchNextPage}
                        size="sm"
                    >
                        Error loading more items. Tap to retry.
                    </Button>
                </Center>
            )}
        </Stack>
    );
}

// Export types for external use
export type {RecordsListProps};
