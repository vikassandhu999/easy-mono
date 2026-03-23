import {Spinner} from '@heroui/react';
import {type ReactNode} from 'react';

type InfiniteListProps<T> = {
  /** The flattened items to render (all pages combined) */
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Unique key extractor */
  keyExtractor: (item: T) => string;
  /** Whether the initial load is in progress (no data yet) */
  isLoading: boolean;
  /** Whether the next page is being fetched — from RTK's useInfiniteQuery */
  isFetchingNextPage: boolean;
  /** Whether the query errored */
  isError: boolean;
  /** Whether there are more pages — from RTK's useInfiniteQuery */
  hasNextPage: boolean;
  /** Ref callback to attach to the sentinel div — from useInfiniteScroll */
  sentinelRef: (node: HTMLDivElement | null) => void;
  /** Content to show when items is empty and not loading/erroring */
  emptyState?: ReactNode;
  /** Content to show on error */
  errorState?: ReactNode;
  /** Optional className for the list container */
  className?: string;
};

/**
 * Reusable infinite-scrolling list component.
 *
 * Renders items, a bottom sentinel for triggering next-page loads,
 * and handles loading / error / empty / end-of-list states.
 *
 * Pair with `useInfiniteScroll` hook and a `build.infiniteQuery` endpoint.
 */
export default function InfiniteList<T>({
  items,
  renderItem,
  keyExtractor,
  isLoading,
  isFetchingNextPage,
  isError,
  hasNextPage,
  sentinelRef,
  emptyState,
  errorState,
  className = 'flex flex-col gap-2',
}: InfiniteListProps<T>) {
  // Initial loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner color="accent" />
      </div>
    );
  }

  // Error on initial load
  if (isError && items.length === 0) {
    return (
      errorState ?? (
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center text-sm text-danger">
          Failed to load data. Please try again.
        </div>
      )
    );
  }

  // Empty state
  if (items.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <>
      <div className={className}>
        {items.map((item, index) => (
          <div key={keyExtractor(item)}>{renderItem(item, index)}</div>
        ))}
      </div>

      {/* Sentinel — triggers next page load when scrolled into view */}
      {hasNextPage && (
        <div
          className="flex items-center justify-center py-4"
          ref={sentinelRef}
        >
          {isFetchingNextPage && <Spinner size="sm" />}
        </div>
      )}
    </>
  );
}
