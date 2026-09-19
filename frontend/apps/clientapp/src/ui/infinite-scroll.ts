import {type RefObject, useEffect, useRef} from 'react';

export function useInfiniteScroll({
  hasNextPage,
  isFetching,
  isError,
  fetchNextPage,
  root,
}: {
  hasNextPage: boolean;
  isFetching: boolean;
  isError: boolean;
  fetchNextPage: (options: {cancelRefetch: false}) => Promise<unknown>;
  root?: RefObject<HTMLElement | null>;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage || isFetching || isError || !('IntersectionObserver' in window)) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          observer.disconnect();
          fetchNextPage({cancelRefetch: false});
        }
      },
      {root: root?.current ?? null, rootMargin: root ? '0px' : '200px'},
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, isError, fetchNextPage, root]);
  return sentinel;
}
