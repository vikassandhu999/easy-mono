import type {Key} from '@heroui/react';
import {Button, Collection, Description, Label, ListBox, ListBoxLoadMoreItem, Spinner, Typography} from '@heroui/react';
import {cn} from '@heroui/styles';
import {ChevronRight} from 'lucide-react';
import type {ReactNode} from 'react';

import {ListSkeleton} from '@/@components/list-skeleton';

/**
 * The redesign's browse-list row: hairline-separated, square corners inside the
 * list card, no press-scale animation. Still exported because three dashboard
 * cells borrow the row look; the browse chrome that used to live beside it now
 * belongs to `browse-screen.tsx`. Owns the full spec — call sites pass only
 * per-domain classes, never a padding/border override.
 *
 * Separators anchor to the TOP edge with `first:` exceptions, not bottom/`last:`:
 * react-aria appends its load-more sentinel after the final row, so the last row
 * is never `:last-child` and a bottom border would always paint against the
 * card edge.
 */
export const LIST_ITEM_CLASS =
  'relative min-h-fit gap-3 rounded-none border-b-0 px-3 py-3 leading-[normal] transition-none! text-foreground sm:px-4 ' +
  "after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:start-16 after:h-px after:bg-separator after:content-[''] " +
  'first:after:hidden sm:border-t sm:border-separator sm:after:hidden sm:first:border-t-0 ' +
  'hover:bg-surface-secondary active:scale-100! data-[pressed=true]:scale-100!';

/** The redesign's white outline chip (macro/meta pills on rows and detail pages). */
export const OUTLINE_CHIP_CLASS = 'shrink-0 rounded-chip border border-border bg-surface font-semibold text-foreground';

type BrowseRowProps = {
  /** Tile contents: a lucide glyph, or `BrowseRowThumb` for image-backed rows. */
  icon: ReactNode;
  /** Extra classes for the icon tile — only for a domain that tints it (e.g. `bg-warning-soft`). */
  iconClassName?: string;
  id: Key;
  /** Secondary line under the title. Truncates. */
  meta?: ReactNode;
  /** Typeahead/accessible text for the row. */
  textValue: string;
  title: string;
  /** Style-diff anchor prefix; the row's parts derive their ids from it. */
  testId?: string;
  /** Chips shown before the chevron. The chevron is always rendered. */
  trailing?: ReactNode;
};

/**
 * One browse-list row: icon tile → title + meta column → trailing chips → chevron.
 * Owns the whole skeleton so per-domain files carry only their icon, meta string,
 * and chips. Pair with `BrowseListBox`; never hand-roll the row markup.
 *
 * Deliberately narrow: no className/layout overrides. A row whose anatomy differs
 * (extra tracks, custom grid — see the clients list) is its own `ListBox.Item`
 * built on `LIST_ITEM_CLASS`, not a bent BrowseRow.
 */
export function BrowseRow({icon, iconClassName, id, meta, testId, textValue, title, trailing}: BrowseRowProps) {
  return (
    <ListBox.Item
      className={cn(LIST_ITEM_CLASS, 'mt-0')}
      data-testid={testId}
      id={id}
      textValue={textValue}
    >
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-tertiary text-muted sm:size-10.5',
          iconClassName,
        )}
        data-testid={testId ? `${testId}-thumb` : undefined}
      >
        {icon}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Label
          className="min-w-0 max-w-full truncate text-body font-semibold leading-[normal] text-foreground"
          data-testid={testId ? `${testId}-title` : undefined}
        >
          {title}
        </Label>
        {meta === undefined ? null : (
          <Description
            className="max-w-full truncate text-eyebrow leading-[normal] text-muted sm:text-eyebrow"
            data-testid={testId ? `${testId}-meta` : undefined}
          >
            {meta}
          </Description>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {trailing}
        <ChevronRight
          className="shrink-0 leading-[normal] text-muted"
          data-testid={testId ? `${testId}-chevron` : undefined}
        />
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
      className="size-11 rounded-panel object-cover"
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
      // overflow-visible: HeroUI's list-box is overflow:clip, and the load-more
      // sentinel (a 0-height div whose margin collapses through) lands just past
      // the box's edge — clip swallows it and infinite scroll silently dies.
      // The surface card above owns the rounded-corner clipping instead.
      className={cn('overflow-visible', className)}
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
