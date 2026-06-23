import type {Key} from '@heroui/react';
import {Collection, ListBox, ListBoxLoadMoreItem, Spinner, Typography} from '@heroui/react';
import type {ReactNode} from 'react';

/** Shared row styling for browse-list items: padding + disabled press animation. */
export const LIST_ITEM_CLASS =
  'min-h-fit px-4 py-2 sm:px-8 transition-none! active:scale-100! data-[pressed=true]:scale-100!';

type Props<T extends object> = {
  ariaLabel: string;
  className?: string;
  emptyState: ReactNode;
  fetchNextPage: () => void;
  isLoading: boolean;
  items: T[];
  onAction?: (key: Key) => void;
  renderItem: (item: T) => ReactNode;
};

export default function BrowseListBox<T extends object>({
  ariaLabel,
  className = 'flex-1',
  emptyState,
  fetchNextPage,
  isLoading,
  items,
  onAction,
  renderItem,
}: Props<T>) {
  return (
    <ListBox
      aria-label={ariaLabel}
      className={className}
      onAction={onAction}
      renderEmptyState={() => emptyState}
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
