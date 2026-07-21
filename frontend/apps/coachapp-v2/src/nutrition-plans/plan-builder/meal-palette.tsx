/**
 * Meal palettes — the NB "Add meal" panel and the per-meal "Add a swap" panel.
 *
 * GAPS.md #10: both are pickers, so both follow the canonical responsive
 * overlay rule — `ResponsiveOverlay` wraps ONE shared content component
 * (`MealPaletteContent`) in an anchored `Popover` on desktop and a
 * `KeyboardSheet` on mobile. Reuse lists are a `ListBox` with a `Header` per
 * group, mirroring `checkins/question-palette.tsx`.
 *
 * "Add meal" offers `Create a new meal` (empty meal, opened in rename mode) or
 * `Reuse an existing meal` — a plan-level meal that isn't on this day yet
 * (INTERACTIONS.md § NB). "Add a swap" reuses the same list shape for the
 * meal's `Client can swap with` alternates.
 */
import {Button, Label, ListBox, Typography} from '@heroui/react';
import {Plus} from 'lucide-react';
import {type ReactNode, useRef, useState} from 'react';

import {ResponsiveOverlay} from '@/builder-kit/responsive-overlay';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MealPaletteOption {
  id: string;
  name: string;
  /** Secondary line — "On Mon, Tue · Lunch" for reuse, "474 kcal" for swaps. */
  sub?: string;
}

interface MealPaletteContentProps {
  /** Rendered above the reuse list — the "Create a new meal" affordance. */
  createSlot?: ReactNode;
  groupLabel: string;
  options: MealPaletteOption[];
  emptyLabel: string;
  onPick: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Shared content
// ---------------------------------------------------------------------------

function MealPaletteContent({createSlot, groupLabel, options, emptyLabel, onPick}: MealPaletteContentProps) {
  return (
    <div className="flex flex-col gap-4">
      {createSlot}
      <div className="flex flex-col gap-2">
        <Typography
          className="uppercase tracking-wide"
          color="muted"
          type="body-xs"
          weight="bold"
        >
          {groupLabel}
        </Typography>
        {options.length === 0 ? (
          <Typography
            color="muted"
            type="body-sm"
          >
            {emptyLabel}
          </Typography>
        ) : (
          <ListBox
            aria-label={groupLabel}
            className="p-0"
            onAction={(key) => onPick(String(key))}
            selectionMode="none"
          >
            {options.map((option) => (
              <ListBox.Item
                className="min-h-11"
                id={option.id}
                key={option.id}
                textValue={option.name}
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <Label className="max-w-full truncate">{option.name}</Label>
                  {option.sub ? <span className="max-w-full truncate text-chip text-muted">{option.sub}</span> : null}
                </div>
              </ListBox.Item>
            ))}
          </ListBox>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Responsive shell
// ---------------------------------------------------------------------------

interface MealPaletteControlProps extends Omit<MealPaletteContentProps, 'onPick'> {
  title: string;
  trigger: (props: {onPress: () => void; ref: React.Ref<HTMLButtonElement>}) => ReactNode;
  onPick: (id: string) => void;
  /** Rendered inside the overlay as the "create" row; receives a close callback. */
  renderCreate?: (close: () => void) => ReactNode;
}

function MealPaletteControl({title, trigger, onPick, renderCreate, ...content}: MealPaletteControlProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = () => setOpen(false);
  const pick = (id: string) => {
    setOpen(false);
    onPick(id);
  };

  return (
    <>
      {trigger({onPress: () => setOpen(true), ref: triggerRef})}
      <ResponsiveOverlay
        isOpen={open}
        onOpenChange={setOpen}
        title={title}
        triggerRef={triggerRef}
      >
        <MealPaletteContent
          {...content}
          createSlot={renderCreate?.(close)}
          onPick={pick}
        />
      </ResponsiveOverlay>
    </>
  );
}

// ---------------------------------------------------------------------------
// Add meal
// ---------------------------------------------------------------------------

interface AddMealControlProps {
  /** Plan meals that aren't on this day yet. */
  reusable: MealPaletteOption[];
  onCreate: () => void;
  onReuse: (mealId: string) => void;
}

export function AddMealControl({reusable, onCreate, onReuse}: AddMealControlProps) {
  return (
    <MealPaletteControl
      emptyLabel="Every meal is already on this day."
      groupLabel="Reuse an existing meal"
      onPick={onReuse}
      options={reusable}
      renderCreate={(close) => (
        <Button
          className="h-auto w-full flex-col items-start gap-0.5 rounded-control px-3 py-2.5 text-left"
          onPress={() => {
            close();
            onCreate();
          }}
          variant="outline"
        >
          <span className="text-sm font-semibold text-foreground">Create a new meal</span>
          <span className="text-chip text-muted">Start empty, add foods or recipes</span>
        </Button>
      )}
      title="Add meal"
      trigger={({onPress, ref}) => (
        <Button
          className="min-h-11 w-full rounded-control border border-dashed border-border text-accent"
          onPress={onPress}
          ref={ref}
          variant="ghost"
        >
          <Plus className="size-4" />
          Add meal
        </Button>
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Add swap
// ---------------------------------------------------------------------------

interface AddSwapControlProps {
  /** Other meals in the plan that aren't already alternates of this one. */
  options: MealPaletteOption[];
  onAdd: (mealId: string) => void;
}

export function AddSwapControl({options, onAdd}: AddSwapControlProps) {
  return (
    <MealPaletteControl
      emptyLabel="No other meals yet"
      groupLabel="Add a swap"
      onPick={onAdd}
      options={options}
      title="Add a swap"
      trigger={({onPress, ref}) => (
        <Button
          className="min-h-11 px-0 text-xs font-semibold text-accent"
          onPress={onPress}
          ref={ref}
          size="sm"
          variant="ghost"
        >
          + Add a swap
        </Button>
      )}
    />
  );
}
