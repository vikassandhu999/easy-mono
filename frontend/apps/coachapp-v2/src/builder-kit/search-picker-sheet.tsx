/**
 * SearchPickerSheet — a generic, controlled, presentational search + multi-select picker
 * that composes KeyboardSheet.
 *
 * Design principles:
 * - Fully controlled: no data fetching, no internal selection state. The caller
 *   owns search text, filter state, selected keys, and item data.
 * - Generic over item type T: `renderItem`, `itemKey`, `onToggleItem` are typed
 *   against T, so callers stay type-safe without casting.
 * - Infinite scroll: HeroUI's load-more item calls `onLoadMore` when visible.
 * - Layout matches `04-picker-and-set-sheet.html`: grip → title/close → search →
 *   filter chips (h-scroll) → item list → "+ Create" row → confirm dock (footer).
 * - Container: `PickerModal` — centered modal on desktop, KeyboardSheet on
 *   mobile (the canonical picker shell).
 */

import {Button, ListBox, ListBoxLoadMoreItem, SearchField, Spinner} from '@heroui/react';
import {Plus} from 'lucide-react';
import type {ReactNode} from 'react';

import {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import {ErrorState} from '@/@components/error-state';

import {PickerModal} from './picker-modal';

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
  itemTextValue: (item: T) => string;
  error?: boolean;
  onRetry?: () => void;

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
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** The scrollable search + filters + list block, shell-free — exported so a
 *  flow that hosts the picker inside its own surface (e.g. the nutrition
 *  add-items modal) can reuse it without forking. */
export type SearchPickerBodyProps<T> = Pick<
  SearchPickerSheetProps<T>,
  | 'createLabel'
  | 'error'
  | 'filters'
  | 'filtersLayout'
  | 'hasMore'
  | 'itemKey'
  | 'itemTextValue'
  | 'items'
  | 'loading'
  | 'onCreateNoMatch'
  | 'onLoadMore'
  | 'onRetry'
  | 'onSearchChange'
  | 'onToggleItem'
  | 'renderItem'
  | 'search'
  | 'selectedKeys'
  | 'title'
>;

export function SearchPickerBody<T>({
  title,
  search,
  onSearchChange,
  filters,
  filtersLayout = 'scroll',
  items,
  renderItem,
  itemKey,
  itemTextValue,
  selectedKeys,
  onToggleItem,
  onCreateNoMatch,
  createLabel,
  loading = false,
  onLoadMore,
  hasMore = false,
  error = false,
  onRetry,
}: SearchPickerBodyProps<T>) {
  const showCreateRow = onCreateNoMatch !== undefined && search.trim().length > 0 && items.length === 0 && !loading;

  // The sticky search header relies on an overflow-y-auto ancestor with px-4
  // padding — every host container provides it.
  return (
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
                  ' rounded-chip border bg-transparent px-2 py-1 type-eyebrow font-medium',
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

      {/* The error state replaces the whole list body: stale rows, create-row
          and spinner would all lie about a load that failed. */}
      {error ? (
        <div className="py-4">
          <ErrorState
            message="Couldn't load results."
            {...(onRetry ? {onRetry} : {})}
          />
        </div>
      ) : items.length > 0 ? (
        <ListBox
          aria-label={`${title} results`}
          className="overflow-visible p-0"
          onSelectionChange={(keys) => {
            const next = new Set([...keys].map(String));
            const changed = items.find((item) => selectedKeys.has(itemKey(item)) !== next.has(itemKey(item)));
            if (changed) {
              onToggleItem(changed);
            }
          }}
          selectedKeys={selectedKeys}
          selectionMode="multiple"
        >
          {items.map((item) => {
            const key = itemKey(item);
            return (
              <ListBox.Item
                className={`${LIST_ITEM_CLASS} data-[selected=true]:bg-accent-soft`}
                id={key}
                key={key}
                textValue={itemTextValue(item)}
              >
                <span className="block w-full min-w-0">{renderItem(item, selectedKeys.has(key))}</span>
              </ListBox.Item>
            );
          })}
          {hasMore ? (
            <ListBoxLoadMoreItem
              isLoading={loading}
              onLoadMore={() => onLoadMore?.()}
            >
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            </ListBoxLoadMoreItem>
          ) : null}
        </ListBox>
      ) : (
        <>
          {showCreateRow ? (
            <Button
              className="h-auto w-full min-w-0 justify-start gap-2 px-0 py-3 text-left type-body text-accent"
              onPress={() => onCreateNoMatch?.(search)}
              variant="ghost"
            >
              <Plus className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                {createLabel ? createLabel(search) : `Create "${search}"`}
              </span>
            </Button>
          ) : loading ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : (
            <div className="py-8 text-center type-body text-muted">No results found.</div>
          )}
        </>
      )}
    </>
  );
}

export function SearchPickerSheet<T>(props: SearchPickerSheetProps<T>) {
  const {open, onClose, title, selectedKeys, onConfirm, confirmLabel} = props;
  const selectedCount = selectedKeys.size;

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

  return (
    <PickerModal
      footer={dockButton}
      onClose={onClose}
      open={open}
      title={title}
    >
      <SearchPickerBody {...props} />
    </PickerModal>
  );
}
