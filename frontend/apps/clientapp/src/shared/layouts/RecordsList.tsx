import {Button, Center, Loader, Stack, Text, Transition} from '@mantine/core';
import {useIntersection} from '@mantine/hooks';
import React, {useCallback, useEffect, useRef} from 'react';

interface RecordsListProps<T> {
  className?: string;
  emptyState: React.ReactNode;
  enableInfiniteScroll?: boolean;
  error?: Error | null;
  fetchNextPage: () => void;
  gap?: number | string;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  isLoading?: boolean;
  itemKey?: (item: T, index: number) => number | string;
  loadMoreText?: string;
  onItemClick?: (item: T) => void;
  records: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  retryOnError?: boolean;
  testId?: string;
}

// Memoized item wrapper to prevent unnecessary re-renders
const RecordItem = React.memo(
  <T,>({
    index,
    item,
    onClick,
    renderItem,
  }: {
    index: number;
    item: T;
    onClick?: (item: T) => void;
    renderItem: (item: T, index: number) => React.ReactNode;
  }) => {
    const handleClick = useCallback(() => {
      onClick?.(item);
    }, [item, onClick]);

    return (
      <div
        onClick={onClick ? handleClick : undefined}
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
        role={onClick ? 'button' : undefined}
        style={onClick ? {cursor: 'pointer'} : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {renderItem(item, index)}
      </div>
    );
  },
);

RecordItem.displayName = 'RecordItem';

export default function RecordsList<T>({
  className,
  emptyState,
  enableInfiniteScroll = true,
  error = null,
  fetchNextPage,
  gap = 'sm',
  hasNextPage = false,
  isFetchingNextPage = false,
  isLoading = false,
  itemKey = (item: T, index: number) => {
    return (item as any).id ?? index;
  },
  loadMoreText = 'Load More',
  onItemClick,
  records,
  renderItem,
  retryOnError = true,
  testId = 'records-list',
}: RecordsListProps<T>) {
  // Use refs to track state across renders
  const lastCallTimeRef = useRef(0);
  const hasMountedRef = useRef(false);

  // Use a more reliable intersection observer with smaller rootMargin
  const {entry, ref} = useIntersection({
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
        data-testid={`${testId}-loading`}
        py="xl"
      >
        <Loader size="md" />
      </Center>
    );
  }

  // Show empty state
  if (!isLoading && records.length === 0) {
    return (
      <Transition
        duration={200}
        mounted={true}
        timingFunction="ease"
        transition="fade"
      >
        {(styles) => (
          <div
            data-testid={`${testId}-empty`}
            style={styles}
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
        data-testid={`${testId}-error`}
        py="xl"
      >
        <Stack align="center">
          <Text c="dimmed">Failed to load data</Text>
          {retryOnError && (
            <Button
              onClick={handleFetchNextPage}
              size="sm"
              variant="outline"
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
      className={className}
      data-testid={testId}
      gap={gap}
    >
      {/* Records list */}
      {records.map((record, index) => (
        <RecordItem
          index={index}
          item={record}
          key={itemKey(record, index)}
          onClick={onItemClick}
          renderItem={renderItem}
        />
      ))}

      {/* Better positioned infinite scroll trigger */}
      {hasNextPage &&
        (enableInfiniteScroll ? (
          <div
            data-testid={`${testId}-trigger`}
            ref={ref}
            style={{height: 10, margin: '10px 0'}}
          />
        ) : (
          <Center py="md">
            <Button
              data-testid={`${testId}-load-more`}
              disabled={isFetchingNextPage}
              loading={isFetchingNextPage}
              onClick={handleFetchNextPage}
              size="md"
              variant="outline"
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
            color="red"
            onClick={handleFetchNextPage}
            size="sm"
            variant="subtle"
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
