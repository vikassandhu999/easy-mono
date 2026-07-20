import type {Key} from '@heroui/react';
import {Button, Collection, Description, Label, ListBox, ListBoxLoadMoreItem, Spinner, Typography} from '@heroui/react';
import {cn} from '@heroui/styles';
import {ChevronRight} from 'lucide-react';
import type {ReactNode} from 'react';

import {ListSkeleton} from '@/@components/list-skeleton';

/**
 * The redesign's browse-list row: hairline-separated, square corners inside the
 * list card, no press-scale animation. Owns the full spec — call sites pass only
 * per-domain classes, never a padding/border override.
 */
export const LIST_ITEM_CLASS =
  'relative min-h-fit gap-3 rounded-none border-b-0 px-4 py-3 transition-none! ' +
  "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:start-16 after:h-px after:bg-separator after:content-[''] " +
  'last:after:hidden sm:border-b sm:border-separator sm:after:hidden sm:last:border-0 ' +
  'hover:bg-surface-secondary active:scale-100! data-[pressed=true]:scale-100!';

/** The redesign's white outline chip (macro/meta pills on rows and detail pages). */
export const OUTLINE_CHIP_CLASS = 'shrink-0 rounded-chip border border-border bg-surface font-semibold text-foreground';

/** Responsive shell shared by every top-level browse list. */
export const BROWSE_LIST_SURFACE_CLASS =
  'overflow-hidden border-y border-border bg-background sm:rounded-card sm:border sm:bg-surface';

/** Zero-gutter mobile list frame; restores the canonical page gutter on larger screens. */
export const BROWSE_LIST_FRAME_CLASS = 'flex min-h-0 flex-1 flex-col px-0 pb-0 sm:px-4 sm:pb-6 md:px-6 lg:px-8';

/** Search-field surface used by browse toolbars at both breakpoints. */
export const BROWSE_SEARCH_GROUP_CLASS = 'min-h-11 border border-border bg-background shadow-none  sm:bg-surface';

/**
 * Ink-selected filter pill (RECIPES.md R2). HeroUI ToggleButton exposes selection
 * as `data-selected="true"` — there is no `selected:` Tailwind variant registered
 * in this project, so `selected:*` classes silently no-op.
 */
export const FILTER_PILL_CLASS =
  'me-2.5 min-h-11 rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 py-2 text-sm font-medium text-muted shadow-none ' +
  'data-[selected=true]:border-foreground data-[selected=true]:bg-transparent data-[selected=true]:font-semibold data-[selected=true]:text-foreground ' +
  'sm:me-0  sm:rounded-control sm:border sm:border-border sm:bg-surface sm:px-3.5 sm:text-pill ' +
  'sm:data-[selected=true]:border-ink sm:data-[selected=true]:bg-ink sm:data-[selected=true]:text-ink-foreground';

type BrowseRowProps = {
  className?: string;
  /** Tile contents: a lucide glyph, or `BrowseRowThumb` for image-backed rows. */
  icon: ReactNode;
  /** Extra classes for the icon tile — only for a domain that tints it (e.g. `bg-warning-soft`). */
  iconClassName?: string;
  id: Key;
  /** Secondary line under the title. Truncates. */
  meta?: ReactNode;
  /** Typeahead/accessible text for the row. */
  textValue: string;
  title: ReactNode;
  /** Chips shown before the chevron. The chevron is always rendered. */
  trailing?: ReactNode;
  trailingClassName?: string;
};

/**
 * One browse-list row: icon tile → title + meta column → trailing chips → chevron.
 * Owns the whole skeleton so per-domain files carry only their icon, meta string,
 * and chips. Pair with `BrowseListBox`; never hand-roll the row markup.
 */
export function BrowseRow({
  className,
  icon,
  iconClassName,
  id,
  meta,
  textValue,
  title,
  trailing,
  trailingClassName,
}: BrowseRowProps) {
  return (
    <ListBox.Item
      className={cn(LIST_ITEM_CLASS, 'mt-0', className)}
      id={id}
      textValue={textValue}
    >
      <div
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-secondary',
          iconClassName,
        )}
      >
        {icon}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Label className="min-w-0 max-w-full truncate text-sm font-semibold text-foreground">{title}</Label>
        {meta === undefined ? null : (
          <Description className="max-w-full truncate text-xs text-muted">{meta}</Description>
        )}
      </div>

      <div className={cn('flex shrink-0 items-center gap-1.5', trailingClassName)}>
        {trailing}
        <ChevronRight className="size-4 shrink-0 text-muted-2" />
      </div>
    </ListBox.Item>
  );
}

/** The image-or-fallback contents of a `BrowseRow` icon tile. */
export function BrowseRowThumb({alt, fallback, src}: {alt: string; fallback: ReactNode; src?: string | null}) {
  if (!src) {
    return fallback;
  }
  return (
    <img
      alt={alt}
      className="size-11 rounded-xl object-cover"
      src={src}
    />
  );
}

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
              Couldn't load {ariaLabel.toLowerCase()}. Check your connection and try again.
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
