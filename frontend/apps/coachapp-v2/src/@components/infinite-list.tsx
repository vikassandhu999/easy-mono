import {Spinner} from '@heroui/react';
import {type ReactNode} from 'react';

type InfiniteListProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  isError: boolean;
  hasNextPage: boolean;
  sentinelRef: (node: HTMLDivElement | null) => void;
  emptyState?: ReactNode;
  errorState?: ReactNode;
  className?: string;
};

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
