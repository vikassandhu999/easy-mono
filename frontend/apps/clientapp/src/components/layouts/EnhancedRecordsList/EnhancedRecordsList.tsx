import React, {useCallback, useEffect, useRef, useMemo} from 'react';
import {Stack, Button, Center, Loader, Transition, Text, Divider, Group, Box} from '@mantine/core';
import {useIntersection} from '@mantine/hooks';
import {useWindowVirtualizer} from '@tanstack/react-virtual';

export type ListLayout = 'card' | 'simple' | 'compact';

interface EnhancedRecordsListProps<T> {
    records: T[];
    hasNextPage?: boolean;
    fetchNextPage: () => void;
    isFetchingNextPage?: boolean;
    isLoading?: boolean;
    emptyState: React.ReactNode;
    loadMoreText?: string;
    itemKey?: (item: T, index: number) => string | number;
    renderItem: (item: T, index: number, layout: ListLayout) => React.ReactNode;
    enableInfiniteScroll?: boolean;
    gap?: number | string;
    className?: string;
    onItemClick?: (item: T) => void;
    testId?: string;
    error?: Error | null;
    retryOnError?: boolean;
    layout?: ListLayout;
    showDividers?: boolean;
    header?: React.ReactNode;
    showItemCount?: boolean;
    loadingComponent?: React.ReactNode;
    maxItemsPerPage?: number;
    estimatedItemHeight?: number;
    containerHeight?: number | string;
}

// Memoized item wrapper
const VirtualRecordItem = React.memo(
    <T,>({
        item,
        index,
        renderItem,
        onClick,
        layout,
        showDivider,
        measureElement,
    }: {
        item: T;
        index: number;
        renderItem: (item: T, index: number, layout: ListLayout) => React.ReactNode;
        onClick?: (item: T) => void;
        layout: ListLayout;
        showDivider: boolean;
        measureElement?: (el: HTMLElement | null) => void;
    }) => {
        const handleClick = useCallback(() => {
            onClick?.(item);
        }, [item, onClick]);

        return (
            <div ref={measureElement}>
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
                    {renderItem(item, index, layout)}
                </div>
                {showDivider && (
                    <Divider
                        color="gray.1"
                        size="xs"
                        style={{
                            margin: 0,
                            borderColor: '#e9ecef',
                        }}
                    />
                )}
            </div>
        );
    },
);

VirtualRecordItem.displayName = 'VirtualRecordItem';

export function EnhancedRecordsList<T>({
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
    layout = 'card',
    showDividers = false,
    header,
    showItemCount = false,
    loadingComponent,
    maxItemsPerPage,
    estimatedItemHeight = 100,
    containerHeight = '100vh',
}: EnhancedRecordsListProps<T>) {
    const parentRef = useRef<HTMLDivElement>(null);
    const lastCallTimeRef = useRef(0);
    const hasMountedRef = useRef(false);
    const measuredHeights = useRef<Map<number, number>>(new Map());

    // Intersection observer for infinite scroll trigger
    const {ref: intersectionRef, entry} = useIntersection({
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
    });

    // Determine if we should show dividers
    const shouldShowDividers = layout === 'simple' && showDividers;

    // Apply max items per page if specified
    const displayedRecords = maxItemsPerPage ? records.slice(0, maxItemsPerPage) : records;
    const hasMoreItemsToShow = maxItemsPerPage && records.length > maxItemsPerPage;

    // Convert gap to number
    const gapValue = useMemo(() => {
        if (layout !== 'card') return 0;
        if (typeof gap === 'number') return gap;
        // Mantine theme spacing values
        const spacingMap: Record<string, number> = {
            xs: 8,
            sm: 12,
            md: 16,
            lg: 20,
            xl: 24,
        };
        return spacingMap[gap as string] || 12;
    }, [gap, layout]);

    // Initialize virtualizer
    const virtualizer = useWindowVirtualizer({
        count: displayedRecords.length,
        // getScrollElement: () => parentRef.current,
        estimateSize: useCallback(
            (index: number) => {
                const measured = measuredHeights.current.get(index);
                return (measured || estimatedItemHeight) + (layout === 'card' ? gapValue : 0);
            },
            [estimatedItemHeight, gapValue, layout],
        ),
        overscan: 3,
    });

    const virtualItems = virtualizer.getVirtualItems();

    // Fixed infinite scroll handler with throttling
    const handleFetchNextPage = useCallback(() => {
        const now = Date.now();
        if (now - lastCallTimeRef.current > 500) {
            lastCallTimeRef.current = now;
            fetchNextPage();
        }
    }, [fetchNextPage]);

    // Set up intersection observer effect
    useEffect(() => {
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            return;
        }

        if (enableInfiniteScroll && entry?.isIntersecting && hasNextPage && !isLoading && !isFetchingNextPage) {
            handleFetchNextPage();
        }
    }, [entry?.isIntersecting, enableInfiniteScroll, hasNextPage, isLoading, isFetchingNextPage, handleFetchNextPage]);

    // Check if we're near the end for virtual infinite scroll
    useEffect(() => {
        if (!enableInfiniteScroll || !hasNextPage || isLoading || isFetchingNextPage) return;

        const lastItem = virtualItems[virtualItems.length - 1];
        if (lastItem && lastItem.index >= displayedRecords.length - 5) {
            handleFetchNextPage();
        }
    }, [
        virtualItems,
        displayedRecords.length,
        enableInfiniteScroll,
        hasNextPage,
        isLoading,
        isFetchingNextPage,
        handleFetchNextPage,
    ]);

    // Show loading state for initial load
    if (isLoading && records.length === 0) {
        return (
            <Center
                py="xl"
                data-testid={`${testId}-loading`}
            >
                {loadingComponent || <Loader size="md" />}
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
            gap={0}
            className={className}
            data-testid={testId}
            style={{
                position: 'relative',
                height: containerHeight,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            {(header || showItemCount) && (
                <Group
                    justify="space-between"
                    align="center"
                    mb="sm"
                    style={{
                        padding: layout === 'simple' ? '0 16px' : '0',
                        flexShrink: 0,
                    }}
                >
                    {header}
                    {showItemCount && (
                        <Text
                            size="sm"
                            c="dimmed"
                            fw={500}
                            style={{
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                fontSize: '11px',
                            }}
                        >
                            {records.length} item{records.length !== 1 ? 's' : ''}
                        </Text>
                    )}
                </Group>
            )}

            {/* Virtual list container */}
            <Box
                ref={parentRef}
                style={{
                    flex: 1,
                    overflow: 'auto',
                    position: 'relative',
                    ...(layout === 'simple' && {
                        border: `1px solid #e9ecef`,
                        borderRadius: '12px',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    }),
                }}
            >
                <div
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {virtualItems.map((virtualRow) => {
                        const record = displayedRecords[virtualRow.index];

                        return (
                            <div
                                key={virtualRow.key}
                                data-index={virtualRow.index}
                                ref={virtualizer.measureElement}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                {layout === 'card' && virtualRow.index > 0 && <div style={{height: gapValue}} />}
                                <VirtualRecordItem
                                    item={record}
                                    index={virtualRow.index}
                                    renderItem={renderItem}
                                    onClick={onItemClick}
                                    layout={layout}
                                    showDivider={shouldShowDividers && virtualRow.index < displayedRecords.length - 1}
                                />
                            </div>
                        );
                    })}

                    {/* Infinite scroll trigger */}
                    {hasNextPage && enableInfiniteScroll && (
                        <div
                            ref={intersectionRef}
                            style={{
                                position: 'absolute',
                                bottom: 100,
                                height: 10,
                                width: '100%',
                                pointerEvents: 'none',
                            }}
                            data-testid={`${testId}-trigger`}
                        />
                    )}
                </div>
            </Box>

            {/* Show more items button (for maxItemsPerPage) */}
            {hasMoreItemsToShow && (
                <Center py="sm">
                    <Button
                        variant="subtle"
                        onClick={() => {
                            // This would need to be handled by parent component
                        }}
                        size="sm"
                    >
                        Show {Math.min(maxItemsPerPage!, records.length - displayedRecords.length)} more items
                    </Button>
                </Center>
            )}

            {/* Load more button (non-infinite scroll) */}
            {hasNextPage && !enableInfiniteScroll && (
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
            )}

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

export type {EnhancedRecordsListProps};
