/**
 * MealCard — one meal on the active day of the nutrition plan builder.
 *
 * Collapsed header (redesign): slot tag (opens the slot menu) · meal name ·
 * `Used in {n} places` when the meal is shared across days · `+{n} swap` when
 * the meal has alternates · kcal · ⋯ menu · expand chevron.
 * Expanded body: item rows, `+ Add food or recipe`, then the
 * `Client can swap with` list and `+ Add a swap`.
 *
 * The card is a `Disclosure` (UI-CONTRACT §2 / AGENTS.md — the app has no
 * Accordion). Two triggers are used so the ⋯ menu can sit between the meal's
 * figures and the chevron the way the reference does; the slot tag and the ⋯
 * menu are siblings of the trigger, never nested inside it (no button-in-button).
 *
 * Data model note: the "meal" is a plan-level entity and the day holds an
 * ordered slot option per meal, so this component takes both — `meal` for the
 * content and `optionId` for the day assignment it is rendered under. Swaps are
 * the non-default options in the same slot.
 *
 * Cache: rename/delete → optimistic updateQueryData('getNutritionPlan', {id: planId}, …)
 *        + refetch for server-recomputed nutrition snapshots; patch.undo() + toast on failure.
 */
import {Button, Chip, Disclosure, Dropdown, Label, Separator, Typography} from '@heroui/react';
import {cn} from '@heroui/styles';
import {ArrowLeftRight, MoreHorizontal, TrashIcon, X} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {toastMutationError} from '@/@components/mutation-toast';
import type {NutritionMeal} from '@/api/generated';
import {
  coachApi,
  useDeleteMealItemMutation,
  useDeleteMealMutation,
  useGetNutritionPlanQuery,
  useUpdateMealMutation,
} from '@/api/generated';
import {useAppDispatch} from '@/store';

import {AmountSheet} from './amount-sheet';
import type {FoodOrRecipe} from './food-recipe-picker-sheet';
import {FoodRecipePickerSheet, isRecipe} from './food-recipe-picker-sheet';
import type {HydratedMealItem} from './meal-item-row';
import {MealItemRow} from './meal-item-row';
import type {MealPaletteOption} from './meal-palette';
import {AddSwapControl} from './meal-palette';
import {MealSlotControl} from './meal-slot-control';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MealSwap {
  /** The day-meal option id — removing a swap removes this option. */
  optionId: string;
  meal: NutritionMeal;
}

interface MealCardProps {
  meal: NutritionMeal;
  planId: string;
  open: boolean;
  onToggle: () => void;
  /** Meal slot this meal occupies on the active day. */
  slot: string;
  onChangeSlot: (slot: string) => void;
  /** Removes the meal from this day; the meal itself survives in the plan. */
  onRemoveFromDay: () => void;
  /** How many day-slot options across the plan point at this meal. */
  assignmentCount: number;
  swaps: MealSwap[];
  swapCandidates: MealPaletteOption[];
  onAddSwap: (mealId: string) => void;
  onRemoveSwap: (optionId: string) => void;
  /** Newly created meals open straight into rename mode (INTERACTIONS.md § NB). */
  autoRename?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function kcalLabel(nutrition: NutritionMeal['nutrition']): string | null {
  const kcal = nutrition?.calories;
  return kcal == null ? null : `${Math.round(kcal)} kcal`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MealCard({
  meal,
  planId,
  open,
  onToggle,
  slot,
  onChangeSlot,
  onRemoveFromDay,
  assignmentCount,
  swaps,
  swapCandidates,
  onAddSwap,
  onRemoveSwap,
  autoRename,
}: MealCardProps) {
  const dispatch = useAppDispatch();
  const [updateMeal] = useUpdateMealMutation();
  const [deleteMeal] = useDeleteMealMutation();
  const [deleteMealItem] = useDeleteMealItemMutation();
  const {refetch} = useGetNutritionPlanQuery({id: planId});

  // Inline rename state
  const [editingName, setEditingName] = useState(Boolean(autoRename));
  const [nameValue, setNameValue] = useState(meal.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Keep local name in sync if the server value changes (e.g. refetch)
  useEffect(() => {
    if (!editingName) {
      setNameValue(meal.name);
    }
  }, [meal.name, editingName]);

  // Picker + amount-sheet state — desktop popovers anchor to the "+ Add food
  // or recipe" button (picker + create-mode amounts) or the tapped item row.
  const [pickerOpen, setPickerOpen] = useState(false);
  const addItemButtonRef = useRef<HTMLButtonElement | null>(null);
  // Queue of picked food/recipe items waiting to be amount-edited in sequence
  const [amountQueue, setAmountQueue] = useState<FoodOrRecipe[]>([]);
  const [currentAmountItem, setCurrentAmountItem] = useState<FoodOrRecipe | null>(null);

  // Edit-mode amount sheet state
  const [editingItem, setEditingItem] = useState<HydratedMealItem | null>(null);
  const itemRowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // ---------------------------------------------------------------------------
  // Rename handlers
  // ---------------------------------------------------------------------------

  const startEditing = useCallback(() => {
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }, []);

  const commitRename = useCallback(async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === meal.name) {
      setEditingName(false);
      setNameValue(meal.name);
      return;
    }
    setEditingName(false);
    const patch = dispatch(
      coachApi.util.updateQueryData('getNutritionPlan', {id: planId}, (draft) => {
        const m = draft.data.meals?.find((x) => x.id === meal.id);
        if (m) {
          m.name = trimmed;
        }
      }),
    );
    try {
      await updateMeal({
        id: meal.id,
        nutritionMealRequest: {name: trimmed},
      }).unwrap();
      refetch().catch(() => undefined);
    } catch (e) {
      patch.undo();
      setNameValue(meal.name);
      toastMutationError(e, "Couldn't save changes");
    }
  }, [nameValue, meal.id, meal.name, planId, updateMeal, dispatch, refetch]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        commitRename().catch(() => undefined);
      } else if (e.key === 'Escape') {
        setEditingName(false);
        setNameValue(meal.name);
      }
    },
    [commitRename, meal.name],
  );

  // ---------------------------------------------------------------------------
  // Delete meal (from the whole plan — kept alongside "Remove from this day")
  // ---------------------------------------------------------------------------

  const handleDelete = useCallback(async () => {
    const patch = dispatch(
      coachApi.util.updateQueryData('getNutritionPlan', {id: planId}, (draft) => {
        const idx = draft.data.meals?.findIndex((x) => x.id === meal.id) ?? -1;
        if (idx !== -1) {
          draft.data.meals?.splice(idx, 1);
        }
      }),
    );
    // The backend cascades day_meals with the meal (FK on_delete: :delete_all)
    // — mirror that in the days cache, or a slot keeps pointing at an option
    // whose meal no longer exists.
    const dayMealsPatch = dispatch(
      coachApi.util.updateQueryData('getNutritionPlan', {id: planId}, (draft) => {
        for (const day of draft.data.days ?? []) {
          const dayMeals = (day as {day_meals?: {nutrition_meal_id?: string}[]}).day_meals;
          if (!dayMeals) {
            continue;
          }
          const remaining = dayMeals.filter((dm) => dm.nutrition_meal_id !== meal.id);
          (day as {day_meals?: unknown}).day_meals = remaining;
        }
      }),
    );
    try {
      await deleteMeal({id: meal.id}).unwrap();
      refetch().catch(() => undefined);
    } catch (e) {
      patch.undo();
      dayMealsPatch.undo();
      toastMutationError(e, "Couldn't delete meal");
    }
  }, [meal.id, planId, deleteMeal, dispatch, refetch]);

  // ---------------------------------------------------------------------------
  // Delete meal item
  // ---------------------------------------------------------------------------

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      const patch = dispatch(
        coachApi.util.updateQueryData('getNutritionPlan', {id: planId}, (draft) => {
          const m = draft.data.meals?.find((x) => x.id === meal.id);
          if (m) {
            const idx = m.meal_items.findIndex((i) => i.id === itemId);
            if (idx !== -1) {
              m.meal_items.splice(idx, 1);
            }
          }
        }),
      );
      try {
        await deleteMealItem({id: itemId}).unwrap();
        refetch().catch(() => undefined);
      } catch (e) {
        patch.undo();
        toastMutationError(e, "Couldn't remove item");
      }
    },
    [meal.id, planId, deleteMealItem, dispatch, refetch],
  );

  // ---------------------------------------------------------------------------
  // Add foods/recipes: picker → amount sheet sequence
  // ---------------------------------------------------------------------------

  const handlePick = useCallback((items: FoodOrRecipe[]) => {
    if (items.length === 0) {
      return;
    }
    const [first, ...rest] = items;
    setCurrentAmountItem(first ?? null);
    setAmountQueue(rest);
  }, []);

  const handleAmountClose = useCallback(() => {
    // Advance to the next queued item, or clear
    if (amountQueue.length > 0) {
      const [next, ...rest] = amountQueue;
      setCurrentAmountItem(next ?? null);
      setAmountQueue(rest);
    } else {
      setCurrentAmountItem(null);
      setAmountQueue([]);
    }
  }, [amountQueue]);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const items = meal.meal_items as HydratedMealItem[];
  const kcal = kcalLabel(meal.nutrition);
  const isShared = assignmentCount >= 2;

  // Resolve food/recipe for the AmountSheet create-mode
  const amountFood = currentAmountItem && !isRecipe(currentAmountItem) ? currentAmountItem : undefined;
  const amountRecipe = currentAmountItem && isRecipe(currentAmountItem) ? currentAmountItem : undefined;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Disclosure
      className={cn(
        'overflow-hidden rounded-card border bg-surface',
        isShared ? 'border-warning' : open ? 'border-accent' : 'border-border',
      )}
      isExpanded={open}
      onExpandedChange={onToggle}
    >
      {/* Header row — the slot tag and the ⋯ menu are siblings of the triggers
          so no interactive control is nested inside a button. Below `sm` the
          name takes its own line (`order-last w-full`) so it never truncates
          away next to the slot tag and the figures. */}
      <div className="flex flex-wrap items-center gap-x-2 px-3 py-2">
        <div className="flex-1 shrink-0 sm:flex-none">
          <MealSlotControl
            onChange={onChangeSlot}
            slot={slot}
          />
        </div>

        {editingName ? (
          <input
            ref={nameInputRef}
            // biome-ignore lint/a11y/noAutofocus: name field opens in editing mode on user intent
            autoFocus
            aria-label="Meal name"
            className="order-last w-full min-w-0 border-b border-accent bg-transparent text-sm font-semibold text-foreground outline-none sm:order-none sm:w-auto sm:flex-1"
            onBlur={() => {
              commitRename().catch(() => undefined);
            }}
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={handleNameKeyDown}
            value={nameValue}
          />
        ) : (
          <Disclosure.Heading className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
            <Disclosure.Trigger className="flex min-h-11 w-full items-center gap-2 text-left">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{meal.name}</span>
              {isShared ? (
                <Chip
                  className="shrink-0 rounded-chip"
                  color="warning"
                  size="sm"
                  variant="soft"
                >
                  Used in {assignmentCount} places
                </Chip>
              ) : null}
              {swaps.length > 0 ? (
                <Chip
                  className="shrink-0 rounded-chip"
                  size="sm"
                  variant="secondary"
                >
                  +{swaps.length} swap{swaps.length === 1 ? '' : 's'}
                </Chip>
              ) : null}
              {kcal ? <span className="shrink-0 whitespace-nowrap text-xs text-muted">{kcal}</span> : null}
            </Disclosure.Trigger>
          </Disclosure.Heading>
        )}

        <Dropdown>
          <Button
            aria-label={`Meal options for ${meal.name}`}
            className="size-9 min-w-9 shrink-0 text-muted"
            isIconOnly
            size="sm"
            variant="ghost"
          >
            <MoreHorizontal className="size-4" />
          </Button>
          <Dropdown.Popover>
            {/* Drive selection via the menu so it fires on pointer AND keyboard
                activation — RAC routes Enter/Space through onAction, not the
                item's onPress (same pattern as plan-actions.tsx). */}
            <Dropdown.Menu
              onAction={(key) => {
                if (key === 'rename-meal') {
                  startEditing();
                } else if (key === 'remove-from-day') {
                  onRemoveFromDay();
                } else if (key === 'delete-meal') {
                  handleDelete().catch(() => undefined);
                }
              }}
            >
              <Dropdown.Section>
                <Dropdown.Item
                  id="rename-meal"
                  textValue="Rename meal"
                >
                  <Label>Rename meal</Label>
                </Dropdown.Item>
                <Dropdown.Item
                  id="remove-from-day"
                  textValue="Remove from this day"
                >
                  <Label>Remove from this day</Label>
                </Dropdown.Item>
              </Dropdown.Section>
              <Separator />
              <Dropdown.Section>
                <Dropdown.Item
                  id="delete-meal"
                  textValue="Delete meal"
                  variant="danger"
                >
                  <div className="flex items-center gap-2">
                    <TrashIcon className="size-4 shrink-0 text-danger" />
                    <Label>Delete meal</Label>
                  </div>
                </Dropdown.Item>
              </Dropdown.Section>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>

        <Disclosure.Trigger
          aria-label={open ? `Collapse ${meal.name}` : `Expand ${meal.name}`}
          className="flex size-9 shrink-0 items-center justify-center text-muted"
        >
          <Disclosure.Indicator />
        </Disclosure.Trigger>
      </div>

      <Disclosure.Content>
        <Disclosure.Body className="border-t border-border px-3 pt-1 pb-3">
          {isShared ? (
            <Typography
              className="mt-2 mb-1"
              color="muted"
              type="body-xs"
            >
              This meal is on {assignmentCount} days — edits apply everywhere.
            </Typography>
          ) : null}

          {items.length === 0 ? (
            <Typography
              className="py-2"
              color="muted"
              type="body-sm"
            >
              No foods yet — add the first one below.
            </Typography>
          ) : (
            items.map((item) => (
              <MealItemRow
                key={item.id}
                ref={(el) => {
                  itemRowRefs.current[item.id] = el;
                }}
                item={item}
                onRemove={() => {
                  handleDeleteItem(item.id).catch(() => undefined);
                }}
                onTap={() => setEditingItem(item)}
              />
            ))
          )}

          <Button
            className="mt-1 px-0 text-xs font-semibold text-accent"
            onPress={() => setPickerOpen(true)}
            ref={addItemButtonRef}
            size="sm"
            variant="ghost"
          >
            + Add food or recipe
          </Button>

          {/* Swaps — the meal itself is the default, so this lists alternates only. */}
          <Separator className="my-2 border-t border-dashed border-border bg-transparent" />
          <Typography
            className="uppercase tracking-wide"
            color="muted"
            type="body-xs"
            weight="bold"
          >
            Client can swap with
          </Typography>

          <div className="mt-2 flex flex-col gap-1.5">
            {swaps.map((swap) => (
              <div
                className="flex min-h-11 items-center gap-2 rounded-control border border-border px-3 py-2"
                key={swap.optionId}
              >
                <ArrowLeftRight className="size-4 shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{swap.meal.name}</span>
                {kcalLabel(swap.meal.nutrition) ? (
                  <span className="shrink-0 whitespace-nowrap text-xs text-muted">
                    {kcalLabel(swap.meal.nutrition)}
                  </span>
                ) : null}
                <Button
                  aria-label={`Remove swap ${swap.meal.name}`}
                  className="size-8 min-w-8 shrink-0 text-muted-2"
                  isIconOnly
                  onPress={() => onRemoveSwap(swap.optionId)}
                  size="sm"
                  variant="ghost"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-1">
            <AddSwapControl
              onAdd={onAddSwap}
              options={swapCandidates}
            />
          </div>
        </Disclosure.Body>
      </Disclosure.Content>

      {/* Food/recipe picker sheet */}
      <FoodRecipePickerSheet
        anchorEl={addItemButtonRef.current}
        mealName={meal.name}
        onClose={() => setPickerOpen(false)}
        onPick={handlePick}
        open={pickerOpen}
      />

      {/* Amount sheet — create mode (sequenced per picked item). key by the
          current item so each queued food/recipe remounts with fresh state
          instead of carrying the previous item's grams/serving selection. */}
      <AmountSheet
        anchorEl={addItemButtonRef.current}
        food={amountFood}
        key={currentAmountItem?.id}
        mealId={meal.id}
        onClose={handleAmountClose}
        open={currentAmountItem !== null}
        planId={planId}
        recipe={amountRecipe}
      />

      {/* Amount sheet — edit mode */}
      <AmountSheet
        anchorEl={editingItem ? itemRowRefs.current[editingItem.id] : null}
        existingItem={editingItem ?? undefined}
        mealId={meal.id}
        onClose={() => setEditingItem(null)}
        onDelete={
          editingItem
            ? () => {
                handleDeleteItem(editingItem.id).catch(() => undefined);
                setEditingItem(null);
              }
            : undefined
        }
        open={editingItem !== null}
        planId={planId}
      />
    </Disclosure>
  );
}
