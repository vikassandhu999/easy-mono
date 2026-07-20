import type {Key} from '@heroui/react';
import {Button, Collection, ListBox, ListBoxLoadMoreItem, Spinner, Typography} from '@heroui/react';
import type {ReactNode} from 'react';

import {ListSkeleton} from '@/@components/list-skeleton';

/**
 * The redesign's browse-list row: hairline-separated, square corners inside the
 * list card, no press-scale animation. Owns the full spec — call sites pass only
 * per-domain classes, never a padding/border override.
 */
export const LIST_ITEM_CLASS =
  'min-h-fit gap-3 rounded-none px-4 py-3 transition-none! border-b border-separator last:border-0 ' +
  'hover:bg-surface-secondary active:scale-100! data-[pressed=true]:scale-100!';

/** The redesign's white outline chip (macro/meta pills on rows and detail pages). */
export const OUTLINE_CHIP_CLASS = 'shrink-0 rounded-chip border border-border bg-surface font-semibold text-foreground';

/**
 * Ink-selected filter pill (RECIPES.md R2). HeroUI ToggleButton exposes selection
 * as `data-selected="true"` — there is no `selected:` Tailwind variant registered
 * in this project, so `selected:*` classes silently no-op.
 */
export const FILTER_PILL_CLASS =
  'rounded-control border border-border bg-surface px-3.5 py-2 text-pill font-medium text-muted ' +
  'data-[selected=true]:border-ink data-[selected=true]:bg-ink data-[selected=true]:font-semibold ' +
  'data-[selected=true]:text-ink-foreground';

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
  /** Render round leading blocks in the loading skeleton (client-style rows). */
  skeletonAvatar?: boolean;
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
  skeletonAvatar,
}: Props<T>) {
  return (
    <ListBox
      aria-label={ariaLabel}
      className={className}
      onAction={onAction}
      renderEmptyState={() =>
        isLoading ? (
          <ListSkeleton avatar={skeletonAvatar} />
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
