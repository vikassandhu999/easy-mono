import type {Key} from '@heroui/react';
import {Button, Collection, ListBox, ListBoxLoadMoreItem, Spinner, Typography} from '@heroui/react';
import type {ReactNode} from 'react';

/** Shared row styling for browse-list items: padding + disabled press animation. */
export const LIST_ITEM_CLASS =
  'min-h-fit px-4 py-2 sm:px-8 transition-none! active:scale-100! data-[pressed=true]:scale-100!';

type Props<T extends object> = {
  ariaLabel: string;
  className?: string;
  emptyState: ReactNode;
  fetchNextPage: () => void;
  isError?: boolean;
  isLoading: boolean;
  items: T[];
  onAction?: (key: Key) => void;
  onRetry?: () => void;
  renderItem: (item: T) => ReactNode;
};

export default function BrowseListBox<T extends object>({
  ariaLabel,
  className = 'flex-1',
  emptyState,
  fetchNextPage,
  isError,
  isLoading,
  items,
  onAction,
  onRetry,
  renderItem,
}: Props<T>) {
  return (
    <ListBox
      aria-label={ariaLabel}
      className={className}
      onAction={onAction}
      renderEmptyState={() =>
        isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="sm" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Typography
              color="muted"
              type="body-sm"
            >
              Couldn't load. Check your connection and try again.
            </Typography>
            {onRetry ? (
              <Button
                onPress={onRetry}
                size="sm"
                variant="secondary"
              >
                Retry
              </Button>
            ) : null}
          </div>
        ) : (
          emptyState
        )
      }
      selectionMode="none"
    >
      <Collection items={items}>{renderItem}</Collection>
      <ListBoxLoadMoreItem
        isLoading={isLoading}
        onLoadMore={fetchNextPage}
      >
        <div className="flex items-center justify-center gap-2 py-2">
          <Spinner size="sm" />
          <Typography
            color="muted"
            type="body-sm"
          >
            Loading more...
          </Typography>
        </div>
      </ListBoxLoadMoreItem>
    </ListBox>
  );
}
