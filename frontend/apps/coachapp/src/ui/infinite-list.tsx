import type {InfiniteData, UseInfiniteQueryResult} from '@tanstack/react-query';
import {type ReactNode, useEffect, useRef} from 'react';
import {errorMessage} from '../api/client';
import type {CursorPage} from '../api/pagination';
import {Button} from './button';
import {FormError} from './form-error';
import {Surface} from './page';

type ListQuery<Item> = Pick<
  UseInfiniteQueryResult<InfiniteData<CursorPage<Item>>, Error>,
  | 'data'
  | 'error'
  | 'isPending'
  | 'isPaused'
  | 'isError'
  | 'isFetching'
  | 'isFetchingNextPage'
  | 'isFetchNextPageError'
  | 'hasNextPage'
  | 'fetchNextPage'
  | 'refetch'
>;

export function InfiniteList<Item extends {id: string}>({
  query,
  label,
  singular,
  empty,
  children,
}: {
  query: ListQuery<Item>;
  label: string;
  singular: string;
  empty: ReactNode;
  children: (item: Item) => ReactNode;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const {hasNextPage, isFetching, isError, fetchNextPage} = query;
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
      {rootMargin: '200px'},
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, isError, fetchNextPage]);

  if (!query.data) {
    return (
      <Surface>
        {query.isPending ? (
          <p
            role="status"
            className="py-8 text-muted-foreground"
          >
            {query.isPaused ? 'Waiting for a connection…' : `Loading ${label}…`}
          </p>
        ) : (
          <div className="space-y-4">
            <FormError message={errorMessage(query.error, `We couldn't load your ${label}. Please try again.`)} />
            <Button
              variant="outline"
              isPending={isFetching}
              onPress={() => {
                query.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        )}
      </Surface>
    );
  }

  const count = query.data.pages.at(-1)?.count ?? 0;
  const items = query.data.pages.flatMap((page) => page.data);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p
          role="status"
          className="text-sm text-muted-foreground"
        >
          {count} {count === 1 ? singular : label}
          {isFetching && !query.isFetchingNextPage ? ' · Updating…' : ''}
        </p>
        <Button
          variant="ghost"
          aria-label={`Refresh ${label}`}
          isPending={isFetching}
          onPress={() => {
            query.refetch();
          }}
        >
          Refresh
        </Button>
      </div>
      {query.isPaused && (
        <p
          role="status"
          className="text-sm text-muted-foreground"
        >
          Waiting for a connection… Your loaded results are still here.
        </p>
      )}
      <p
        role="status"
        className="sr-only"
      >
        {query.isFetchingNextPage ? `Loading more ${label}…` : `Loaded results ready.`}
      </p>
      {items.length === 0 ? (
        empty
      ) : (
        <ul
          aria-label={label}
          className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface"
        >
          {items.map((item) => (
            <li key={item.id}>{children(item)}</li>
          ))}
        </ul>
      )}
      {query.isError && (
        <FormError
          message={errorMessage(
            query.error,
            query.isFetchNextPageError
              ? `Couldn't load more ${label}. Your loaded results are still here.`
              : `Couldn't refresh ${label}. Showing the previous results.`,
          )}
        />
      )}
      <div
        ref={sentinel}
        className="flex justify-center py-2"
      >
        {query.isError && !query.isFetchNextPageError ? (
          <Button
            variant="outline"
            isPending={isFetching}
            onPress={() => {
              query.refetch();
            }}
          >
            Retry refresh
          </Button>
        ) : (
          (hasNextPage || items.length > 0) && (
            <Button
              variant="outline"
              isPending={isFetching}
              isDisabled={!hasNextPage}
              onPress={() => {
                fetchNextPage({cancelRefetch: false});
              }}
            >
              {query.isFetchingNextPage
                ? 'Loading more…'
                : query.isFetchNextPageError
                  ? 'Retry loading more'
                  : hasNextPage
                    ? 'Load more'
                    : `All ${label} loaded`}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
