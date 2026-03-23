import {useCallback, useEffect, useRef} from 'react';

type UseInfiniteScrollOptions = {
  /** Whether more pages exist — from RTK Query's useInfiniteQuery */
  hasNextPage: boolean;
  /** Whether a next page is currently being fetched */
  isFetchingNextPage: boolean;
  /** Function to trigger loading the next page — from RTK Query's useInfiniteQuery */
  fetchNextPage: () => void;
  /** IntersectionObserver rootMargin — how early to trigger before sentinel is visible (defaults to '200px') */
  rootMargin?: string;
};

type UseInfiniteScrollReturn = {
  /** Ref callback to attach to the sentinel div at the bottom of the list */
  sentinelRef: (node: HTMLDivElement | null) => void;
};

/**
 * Connects an IntersectionObserver to RTK Query's `useInfiniteQuery` to automatically
 * fetch the next page when a sentinel element scrolls into view.
 *
 * Usage:
 * 1. Define your endpoint with `build.infiniteQuery` (RTK 2.9+).
 * 2. Call the generated `useXxxInfiniteQuery` hook.
 * 3. Pass `hasNextPage`, `isFetchingNextPage`, and `fetchNextPage` from the hook result.
 * 4. Attach the returned `sentinelRef` to a div at the bottom of your list.
 *
 * Pair with `<InfiniteList>` for a complete solution.
 */
export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '200px',
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Sentinel ref callback — sets up / tears down IntersectionObserver
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            loadMore();
          }
        },
        {rootMargin},
      );

      observerRef.current.observe(node);
    },
    [loadMore, rootMargin],
  );

  // Clean up observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {sentinelRef};
}
