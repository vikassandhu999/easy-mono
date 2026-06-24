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
 */

import {Button, Chip, Input, Spinner} from '@heroui/react';
import {type ReactNode, useCallback, useEffect, useRef} from 'react';

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

  // --- Items & rendering ---
  items: T[];
  renderItem: (item: T, selected: boolean) => ReactNode;
  itemKey: (item: T) => string;

  // --- Selection (controlled) ---
  multiSelect?: boolean;
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
  items,
  renderItem,
  itemKey,
  multiSelect = true,
  selectedKeys,
  onToggleItem,
  onConfirm,
  confirmLabel,
  onCreateNoMatch,
  createLabel,
  loading = false,
  onLoadMore,
  hasMore = false,
}: SearchPickerSheetProps<T>) {
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
      color="primary"
      isDisabled={selectedCount === 0}
      onPress={onConfirm}
    >
      {confirmLabel(selectedCount)}
    </Button>
  );

  return (
    <KeyboardSheet
      footer={dockButton}
      onClose={onClose}
      open={open}
      title={title}
    >
      {/* Search input — autofocus when sheet opens */}
      <Input
        aria-label={`Search ${title}`}
        autoFocus
        className="mb-2"
        isClearable
        onValueChange={onSearchChange}
        placeholder="Search…"
        value={search}
        variant="bordered"
      />

      {/* Filter chips — horizontally scrollable row */}
      {filters && filters.length > 0 ? (
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((chip) => (
            <Chip
              className="cursor-pointer shrink-0"
              color={chip.active ? 'primary' : 'default'}
              key={chip.id}
              onClick={chip.onToggle}
              variant={chip.active ? 'solid' : 'bordered'}
            >
              {chip.label}
            </Chip>
          ))}
        </div>
      ) : null}

      {/* Item list — caller-rendered rows.
           Each row is a <button> so it is an interactive element (satisfies
           a11y rules) and naturally handles keyboard activation. The caller's
           renderItem provides the visual content; the button is the tap target. */}
      <div
        className="flex flex-col"
        role={multiSelect ? 'group' : 'radiogroup'}
      >
        {items.map((item) => {
          const key = itemKey(item);
          const selected = selectedKeys.has(key);
          return (
            <button
              aria-pressed={multiSelect ? selected : undefined}
              className="w-full border-b border-divider text-left last:border-b-0"
              key={key}
              onClick={() => onToggleItem(item)}
              type="button"
            >
              {renderItem(item, selected)}
            </button>
          );
        })}

        {/* Create-from-no-match row */}
        {showCreateRow ? (
          <button
            className="flex w-full items-center gap-2 py-3 text-left text-sm text-primary hover:opacity-80 transition-opacity"
            onClick={() => onCreateNoMatch?.(search)}
            type="button"
          >
            <span className="text-base leading-none">+</span>
            <span>{createLabel ? createLabel(search) : `Create "${search}"`}</span>
          </button>
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
    </KeyboardSheet>
  );
}
