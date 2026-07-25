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
import {Button, Label, ListBox} from '@heroui/react';
import {Plus} from 'lucide-react';
import {type ReactNode, useRef, useState} from 'react';

import {AS_TEXT, NO_GAP} from '@/@components/ua-defaults';
import {ResponsiveOverlay} from '@/builder-kit/responsive-overlay';

import {INLINE_LINK} from './ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MealPaletteOption {
  id: string;
  name: string;
  /** Secondary line — "On Mon, Tue · Lunch" for reuse, "474 kcal" for swaps. */
  sub?: string;
  /** Right-aligned figure on reuse rows — the meal's energy. */
  meta?: string;
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
    <div className="flex flex-col gap-2">
      {createSlot}
      <div className="flex flex-col">
        <div
          className="px-3 pt-0.5 pb-2 type-eyebrow font-semibold uppercase tracking-eyebrow text-muted"
          data-testid="nb-reuse-label"
        >
          {groupLabel}
        </div>
        {options.length === 0 ? (
          <div className="px-3 pt-1 pb-2 type-eyebrow text-muted">{emptyLabel}</div>
        ) : (
          <ListBox
            aria-label={groupLabel}
            className="p-0"
            onAction={(key) => onPick(String(key))}
            selectionMode="none"
          >
            {options.map((option) => (
              <ListBox.Item
                className={`min-h-11 gap-2 rounded-control px-3 py-2 sm:min-h-0 ${AS_TEXT}`}
                data-testid="nb-reuse-row"
                id={option.id}
                key={option.id}
                textValue={option.name}
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <Label
                    className="max-w-full truncate type-body font-normal"
                    data-testid="nb-reuse-name"
                  >
                    {option.name}
                  </Label>
                  {option.sub ? (
                    <span
                      className="mt-0.5 max-w-full truncate type-eyebrow text-muted"
                      data-testid="nb-reuse-sub"
                    >
                      {option.sub}
                    </span>
                  ) : null}
                </div>
                {option.meta ? (
                  <span
                    className="shrink-0 whitespace-nowrap type-eyebrow text-muted"
                    data-testid="nb-reuse-kcal"
                  >
                    {option.meta}
                  </span>
                ) : null}
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
          className={`h-auto w-full justify-start gap-2 rounded-control border-0 bg-transparent px-3 py-2 text-left [box-shadow:none] [color:var(--color-foreground)] ${AS_TEXT}`}
          data-testid="nb-create-meal"
          onPress={() => {
            close();
            onCreate();
          }}
          variant="ghost"
        >
          <span
            className={`flex size-7 flex-none items-center justify-center rounded-chip bg-accent-tile text-accent ${AS_TEXT} ${NO_GAP}`}
            data-testid="nb-create-meal-icon"
          >
            <Plus />
          </span>
          <span className="flex flex-col">
            <span
              className="type-body font-semibold text-foreground"
              data-testid="nb-create-meal-title"
            >
              Create a new meal
            </span>
            <span
              className="type-eyebrow font-normal text-muted"
              data-testid="nb-create-meal-sub"
            >
              Start empty, add foods or recipes
            </span>
          </span>
        </Button>
      )}
      title="Add meal"
      trigger={({onPress, ref}) => (
        <Button
          className="w-full gap-1.5 rounded-panel border border-dashed border-border bg-transparent px-1.5 py-px font-btn type-body font-semibold leading-none [box-shadow:none] [color:var(--color-accent)]"
          data-testid="nb-add-meal"
          onPress={onPress}
          ref={ref}
          variant="ghost"
        >
          <Plus />
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
  /** Style-diff anchor — set only on the open meal card (manifests/NB.json). */
  testId?: string;
}

export function AddSwapControl({options, onAdd, testId}: AddSwapControlProps) {
  return (
    <MealPaletteControl
      emptyLabel="No other meals yet"
      groupLabel="Add a swap"
      onPick={onAdd}
      options={options}
      title="Add a swap"
      trigger={({onPress, ref}) => (
        <Button
          className={`${INLINE_LINK} type-eyebrow`}
          data-testid={testId}
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
