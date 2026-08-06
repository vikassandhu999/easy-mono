import {useMemo} from 'react';

type InfiniteItemsQuery<T> = {
  data?: {pages: Array<{data: T[]}>} | null;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  isError?: boolean;
  refetch?: () => unknown;
};

/** Flattens an infinite-query's pages into a single item array. */
export function useInfiniteItems<T>(query: InfiniteItemsQuery<T>) {
  const items = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);
  return {
    // Guarded: react-aria's load-more sentinel fires `onLoadMore` for as long
    // as it is visible, which on a list shorter than the viewport is every
    // render. Unguarded, that hot-loops `fetchNextPage` — and each call's
    // `cancelRefetch` aborts any in-flight invalidation refetch, so mutations
    // (snooze, review) never manage to land fresh data in the cache.
    fetchNextPage: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage();
      }
    },
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError ?? false,
    refetch: () => query.refetch?.(),
    items,
  };
}
