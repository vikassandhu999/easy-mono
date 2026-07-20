/**
 * SearchPickerSheet — a generic, controlled, presentational search + multi-select picker
 * that composes KeyboardSheet.
 *
 * Design principles:
 * - Fully controlled: no data fetching, no internal selection state. The caller
 *   owns search text, filter state, selected keys, and item data.
 * - Generic over item type T: `renderItem`, `itemKey`, `onToggleItem` are typed
 *   against T, so callers stay type-safe without casting.
 * - Infinite scroll: an IntersectionObserver sentinel at the list bottom calls
 *   `onLoadMore` when visible. Observer is only active when `hasMore && !loading`
 *   to prevent redundant fetches and is cleaned up on unmount / prop changes.
 * - Layout matches `04-picker-and-set-sheet.html`: grip → title/close → search →
 *   filter chips (h-scroll) → item list → "+ Create" row → confirm dock (footer).
 * - Responsive container (canonical picker rule): anchored Popover on desktop
 *   when the caller passes `anchorEl`, KeyboardSheet otherwise — same split as
 *   SetSheet / food-picker-control.
 */

import {Button, CloseButton, Popover, SearchField, Spinner} from '@heroui/react';
import {Plus} from 'lucide-react';
import {type ReactNode, useCallback, useEffect, useRef} from 'react';

import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {KeyboardSheet} from './keyboard-sheet';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterChip {
  id: string;
  label: string;
  active: boolean;
  onToggle: () => void;
}

export interface SearchPickerSheetProps<T> {
  // --- Sheet lifecycle ---
  open: boolean;
  onClose: () => void;
  title: string;

  // --- Search ---
  search: string;
  onSearchChange: (value: string) => void;

  // --- Filter chips (horizontal scroll row) ---
  filters?: FilterChip[];
  /** Layout for the filter chip row. 'scroll' (default) is a left-aligned,
   *  horizontally-scrollable auto-width pill row (e.g. exercise muscle/equipment
   *  chips). 'segmented' makes each chip equal-flex and centered, spanning the
   *  full sheet width like a segmented control (e.g. the Foods/Recipes toggle). */
  filtersLayout?: 'scroll' | 'segmented';

  // --- Items & rendering ---
  items: T[];
  renderItem: (item: T, selected: boolean) => ReactNode;
  itemKey: (item: T) => string;

  // --- Selection (controlled, multi-select) ---
  selectedKeys: Set<string>;
  onToggleItem: (item: T) => void;

  // --- Confirm dock ---
  onConfirm: () => void;
  /** e.g. (n) => `Add ${n} exercise${n === 1 ? '' : 's'}` */
  confirmLabel: (count: number) => string;

  // --- Create-from-no-match ---
  /** Called when the user presses the "+ Create" row. Only shown when items is
   *  empty and search is non-empty. */
  onCreateNoMatch?: (query: string) => void;
  /** Override the row label. Defaults to `+ Create "<query>"`. */
  createLabel?: (query: string) => string;

  // --- Infinite scroll ---
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;

  // --- Responsive container ---
  /** Desktop only: the element the popover anchors to (usually the "+ Add …"
   *  button that opened the picker). Absent → bottom sheet on all widths. */
  anchorEl?: HTMLElement | null;
  /** Desktop popover placement. Defaults to `right`, which suits a narrow
   *  "+ Add …" text button; a full-width trigger needs `bottom` or react-aria
   *  flips the panel off the left edge of the viewport. */
  placement?: 'right' | 'bottom';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SearchPickerSheet<T>({
  open,
  onClose,
  title,
  search,
  onSearchChange,
  filters,
  filtersLayout = 'scroll',
  items,
  renderItem,
  itemKey,
  selectedKeys,
  onToggleItem,
  onConfirm,
  confirmLabel,
  onCreateNoMatch,
  createLabel,
  loading = false,
  onLoadMore,
  hasMore = false,
  anchorEl,
  placement = 'right',
}: SearchPickerSheetProps<T>) {
  const isDesktop = useIsDesktop();

  // Stable ref object pointing at the trigger element — react-aria's Popover
  // reads `triggerRef` on Content (same wiring as SetSheet).
  const triggerRef = useRef<HTMLElement | null>(null);
  triggerRef.current = anchorEl ?? null;

  // Ref to the sentinel div at the bottom of the item list.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Ref to the IntersectionObserver so we can clean it up.
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Stable callback — callers likely pass an inline arrow but we don't want the
  // effect to re-run on every render just because the function identity changed.
  const stableOnLoadMore = useCallback(() => {
    onLoadMore?.();
  }, [onLoadMore]);

  // Wire the IntersectionObserver whenever the sentinel, hasMore, or loading
  // changes. Only observe when there is more to load and we are not already
  // fetching to prevent duplicate calls.
  useEffect(() => {
    // Tear down any previous observer first.
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!sentinelRef.current || !hasMore || loading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          stableOnLoadMore();
        }
      },
      {threshold: 0.1},
    );

    observer.observe(sentinelRef.current);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [hasMore, loading, stableOnLoadMore]);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const selectedCount = selectedKeys.size;
  const showCreateRow = onCreateNoMatch !== undefined && search.trim().length > 0 && items.length === 0 && !loading;

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const dockButton = (
    <Button
      className="w-full font-semibold"
      isDisabled={selectedCount === 0}
      onPress={onConfirm}
      variant="primary"
    >
      {confirmLabel(selectedCount)}
    </Button>
  );

  // Body shared by both containers. The sticky search header relies on an
  // overflow-y-auto ancestor with px-4 padding — both containers provide it.
  const body = (
    <>
      {/* Search + filters pinned to the top of the sheet's scroll area so they
           stay reachable as the item list scrolls. -mx-4/px-4 cancels the parent
           content padding; bg-surface matches the panel so scrolled rows don't
           show through. */}
      {/* pt-2 keeps the field's focus ring clear of the scroll container's top
          edge — without it the ring clips against the title row when sticky. */}
      <div className="sticky top-0 z-10 -mx-4 bg-surface px-4 pb-2 pt-2">
        {/* Search input — canonical SearchField (icon + clear button), autofocus
            when the picker opens. Same composition as plan-assign-content. */}
        <SearchField
          aria-label={`Search ${title}`}
          autoFocus
          className="mb-2"
          onChange={onSearchChange}
          value={search}
          variant="secondary"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        {/* Filter chips — scrollable pill row, or an equal-flex segmented control */}
        {filters && filters.length > 0 ? (
          <div
            className={
              filtersLayout === 'segmented' ? 'flex gap-1.5' : 'flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide'
            }
          >
            {filters.map((chip) => (
              // A Button (not a Chip) so the filter is keyboard-operable and its
              // selected state is announced via aria-pressed.
              <Button
                aria-pressed={chip.active}
                className={[
                  'min-h-9 rounded-chip border bg-transparent px-2.5 py-1 text-xs font-medium',
                  filtersLayout === 'segmented' ? 'flex-1 justify-center text-center' : 'shrink-0',
                  chip.active ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted',
                ].join(' ')}
                key={chip.id}
                onPress={chip.onToggle}
                variant="ghost"
              >
                {chip.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Item list — caller-rendered rows.
           Each row is a <button> so it is an interactive element (satisfies
           a11y rules) and naturally handles keyboard activation. The caller's
           renderItem provides the visual content; the button is the tap target. */}
      <div
        className="flex flex-col"
        role="group"
      >
        {items.map((item) => {
          const key = itemKey(item);
          const selected = selectedKeys.has(key);
          return (
            <Button
              aria-pressed={selected}
              className={[
                'h-auto w-full justify-start rounded-none border-b border-border px-0 py-0 text-left last:border-b-0',
                selected ? 'bg-accent-soft' : 'bg-transparent',
              ].join(' ')}
              key={key}
              onPress={() => onToggleItem(item)}
              variant="ghost"
            >
              <span className="block w-full min-w-0">{renderItem(item, selected)}</span>
            </Button>
          );
        })}

        {/* Create-from-no-match row */}
        {showCreateRow ? (
          <Button
            className="h-auto w-full min-w-0 justify-start gap-2 px-0 py-3 text-left text-sm text-accent"
            onPress={() => onCreateNoMatch?.(search)}
            variant="ghost"
          >
            <Plus className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{createLabel ? createLabel(search) : `Create "${search}"`}</span>
          </Button>
        ) : null}

        {/* No-results state — distinct from the loading + create-row cases */}
        {!loading && items.length === 0 && !showCreateRow ? (
          <div className="py-8 text-center text-sm text-muted">No results found.</div>
        ) : null}

        {/* Infinite scroll sentinel — observed by IntersectionObserver */}
        <div
          aria-hidden="true"
          className="h-1"
          ref={sentinelRef}
        />

        {/* Loading indicator */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        ) : null}
      </div>
    </>
  );

  if (isDesktop && anchorEl) {
    return (
      <Popover
        isOpen={open}
        onOpenChange={(v) => {
          if (!v) {
            onClose();
          }
        }}
      >
        <Popover.Content
          className="w-96 rounded-xl border border-border bg-surface p-0 shadow-xl"
          triggerRef={triggerRef}
          placement={placement}
        >
          <Popover.Dialog className="flex max-h-[70vh] flex-col outline-none p-0">
            {/* Title row — KeyboardSheet renders its own; the popover needs one */}
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <span className="text-sm font-semibold text-foreground">{title}</span>
              <CloseButton
                aria-label="Close"
                className="-mr-2 text-muted"
                onPress={onClose}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">{body}</div>
            <div className="border-t border-separator bg-background px-4 py-3">{dockButton}</div>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    );
  }

  return (
    <KeyboardSheet
      footer={dockButton}
      onClose={onClose}
      open={open}
      title={title}
    >
      {body}
    </KeyboardSheet>
  );
}
