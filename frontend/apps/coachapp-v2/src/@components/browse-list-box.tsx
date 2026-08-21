import type {Key} from '@heroui/react';
import {Button, Collection, Description, Label, ListBox, ListBoxLoadMoreItem, Spinner, Typography} from '@heroui/react';
import {cn} from '@heroui/styles';
import {ChevronRight} from 'lucide-react';
import type {ReactNode} from 'react';
import {GridList, GridListLoadMoreItem} from 'react-aria-components';

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
  'relative mt-0 min-h-fit gap-3 rounded-none border-b-0 px-3 py-3 leading-[normal] transition-none! text-foreground sm:px-4 ' +
  "after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:start-16 after:h-px after:bg-separator after:content-[''] " +
  'first:after:hidden sm:border-t sm:border-separator sm:after:hidden sm:first:border-t-0 ' +
  // `transform-none!`, NOT `scale-100!`: the vendor press effect is
  // `.list-box-item[data-pressed=true]{transform:scale(.98)}`, and Tailwind v4's
  // `scale-*` compiles to the standalone `scale` property. Two different
  // properties both apply and multiply, so `scale-100!` never cancelled
  // anything — every browse row in the app has been quietly pressing to 98%
  // under a class that says it doesn't. Same family as RM-134: a utility that
  // looks like the fix and silently isn't.
  'hover:bg-surface-secondary active:transform-none! data-[pressed=true]:transform-none!';

/** The redesign's white outline chip (macro/meta pills on rows and detail pages). */
export const OUTLINE_CHIP_CLASS = 'shrink-0 rounded-chip border border-border bg-surface font-semibold text-foreground';

type BrowseRowProps = {
  /** Tile contents: a lucide glyph, or `BrowseRowThumb` for image-backed rows. */
  icon: ReactNode;
  /** Extra classes for the icon tile — only for a domain that tints it (e.g. `bg-warning-soft`). */
  iconClassName?: string | undefined;
  id: Key;
  /** Secondary line under the title. Truncates. */
  meta?: ReactNode | undefined;
  /** Typeahead/accessible text for the row. */
  textValue: string;
  title: string;
  /** Style-diff anchor prefix; the row's parts derive their ids from it. */
  testId?: string | undefined;
  /** Chips shown before the chevron. The chevron is always rendered. */
  trailing?: ReactNode | undefined;
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
      className={LIST_ITEM_CLASS}
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
          className="min-w-0 max-w-full truncate type-body font-semibold leading-[normal] text-foreground"
          data-testid={testId ? `${testId}-title` : undefined}
        >
          {title}
        </Label>
        {meta === undefined ? null : (
          <Description
            className="max-w-full truncate type-eyebrow leading-[normal] text-muted"
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
export function BrowseRowThumb({
  alt,
  fallback,
  src,
}: {
  alt: string;
  fallback: ReactNode;
  src?: string | null | undefined;
}) {
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
  className?: string | undefined;
  emptyState: ReactNode;
  fetchNextPage: () => void;
  /**
   * Render the collection as a GRID instead of a listbox. Use this — and only
   * this — when rows contain their own controls (the workbench queues put a
   * verb button and a snooze menu on every row).
   *
   * A listbox option is one focusable unit: react-aria gives the whole list a
   * single tab stop and moves between rows with the arrows, so anything
   * focusable INSIDE a row is unreachable by keyboard however correct its
   * markup is. A grid row is a row of focusable cells, which is exactly the
   * shape rows-with-actions have.
   *
   * Grid rows own their own press: `onAction` is a listbox-level prop and is
   * ignored here, so the row component passes `onAction` to its `GridListItem`.
   */
  grid?: boolean | undefined;
  isError?: boolean | undefined;
  isLoading: boolean;
  items: T[];
  onAction?: ((key: Key) => void) | undefined;
  onRetry?: (() => void) | undefined;
  renderItem: (item: T) => ReactNode;
  /** Render round leading blocks in the loading skeleton (client-style rows). */
  skeletonAvatar?: boolean | undefined;
};

export default function BrowseListBox<T extends object>({
  ariaLabel,
  className = 'flex-1',
  emptyState,
  fetchNextPage,
  grid,
  isError,
  isLoading,
  items,
  onAction,
  onRetry,
  renderItem,
  skeletonAvatar,
}: Props<T>) {
  const renderEmptyState = () =>
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
    );

  const loadMore = (
    <div className="flex items-center justify-center gap-2 py-2">
      <Spinner size="sm" />
      <Typography
        color="muted"
        type="body-sm"
      >
        Loading more...
      </Typography>
    </div>
  );

  const hasMore = items.length > 0 && !isError;
  // overflow-visible: HeroUI's list-box is overflow:clip, and the load-more
  // sentinel (a 0-height div whose margin collapses through) lands just past
  // the box's edge — clip swallows it and infinite scroll silently dies.
  // The surface card above owns the rounded-corner clipping instead.
  const listClassName = cn('overflow-visible', className);

  if (grid) {
    return (
      <GridList
        aria-label={ariaLabel}
        {...(listClassName ? {className: listClassName} : {})}
        renderEmptyState={renderEmptyState}
        selectionMode="none"
      >
        <Collection items={items}>{renderItem}</Collection>
        {hasMore ? (
          <GridListLoadMoreItem
            isLoading={isLoading}
            onLoadMore={fetchNextPage}
          >
            {loadMore}
          </GridListLoadMoreItem>
        ) : null}
      </GridList>
    );
  }

  return (
    <ListBox
      aria-label={ariaLabel}
      {...(listClassName ? {className: listClassName} : {})}
      {...(onAction ? {onAction} : {})}
      renderEmptyState={renderEmptyState}
      selectionMode="none"
    >
      <Collection items={items}>{renderItem}</Collection>
      {hasMore ? (
        <ListBoxLoadMoreItem
          isLoading={isLoading}
          onLoadMore={fetchNextPage}
        >
          {loadMore}
        </ListBoxLoadMoreItem>
      ) : null}
    </ListBox>
  );
}
