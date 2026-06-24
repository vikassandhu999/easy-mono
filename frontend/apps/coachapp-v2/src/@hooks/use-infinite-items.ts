import {useMemo} from 'react';

type InfiniteItemsQuery<T> = {
  data?: {pages: Array<{data: T[]}>} | null;
  fetchNextPage: () => void;
  isLoading: boolean;
  isFetchingNextPage: boolean;
};

/** Flattens an infinite-query's pages into a single item array. */
export function useInfiniteItems<T>(query: InfiniteItemsQuery<T>) {
  const items = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);
  return {
    fetchNextPage: query.fetchNextPage,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    items,
  };
}
