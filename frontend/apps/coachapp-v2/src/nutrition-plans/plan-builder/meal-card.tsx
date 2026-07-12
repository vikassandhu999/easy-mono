/**
 * MealCard — one accordion card for a nutrition meal.
 *
 * Header: inline-rename (PATCH meal, optimistic + rollback) + meal macro total
 *         from meal.nutrition (kcal + P/C/F) + chevron + delete menu.
 * Body (open only): one MealItemRow per meal_items + "Add food or recipe" button
 *         that opens FoodRecipePickerSheet (multi-select) → AmountSheet for
 *         each picked item in sequence.
 *
 * Visuals follow the Coachez-Builder design's editor rows: numbered green
 * badge, 1.5px hairline card, dashed add tile, green total strip.
 *
 * Cache: rename/delete → optimistic updateQueryData('getNutritionPlan', {id: planId}, …)
 *        + refetch for server-recomputed nutrition snapshots; patch.undo() + toast on failure.
 */
import {Button, Dropdown, Label, Separator} from '@heroui/react';
import {ChevronDown, ChevronRight, MoreHorizontal, Plus, TrashIcon} from 'lucide-react';
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
import type {NutritionPlanDay} from './plan-days';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MealCardProps {
  meal: NutritionMeal;
  planId: string;
  open: boolean;
  onToggle: () => void;
  /** Position in the meals list — drives the design's numbered badge. */
  index: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number | null | undefined): string {
  if (n == null) {
    return '—';
  }
  return String(Math.round(n));
}

function formatMealTotal(nutrition: NutritionMeal['nutrition']): string {
  if (!nutrition) {
    return '';
  }
  const kcal = nutrition.calories;
  if (kcal == null) {
    return '';
  }
  const p = fmt(nutrition.protein_g);
  const c = fmt(nutrition.carbs_g);
  const f = fmt(nutrition.fat_g);
  return `${Math.round(kcal)} kcal · ${p}P/${c}C/${f}F`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MealCard({meal, planId, open, onToggle, index}: MealCardProps) {
  const dispatch = useAppDispatch();
  const [updateMeal] = useUpdateMealMutation();
  const [deleteMeal] = useDeleteMealMutation();
  const [deleteMealItem] = useDeleteMealItemMutation();
  const {data: planData, refetch} = useGetNutritionPlanQuery({id: planId});

  // Inline rename state
  const [editingName, setEditingName] = useState(false);
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

  const startEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // don't toggle accordion
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
  // Delete meal
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

  const mealTotal = formatMealTotal(meal.nutrition);
  const items = meal.meal_items as HydratedMealItem[];

  // Shared-meal warning: a meal is a reusable entity, so editing it updates
  // everywhere it's assigned. Count how many day slot-options across the plan's
  // days reference this meal; warn when it's used in 2+ places. Read straight
  // off the getNutritionPlan cache (via planData) so day edits keep it fresh.
  const days = (planData?.data.days ?? []) as unknown as NutritionPlanDay[];
  const assignmentCount = days.reduce(
    (n, day) => n + (day.day_meals ?? []).filter((dm) => dm.nutrition_meal_id === meal.id).length,
    0,
  );
  const isShared = assignmentCount >= 2;

  // Resolve food/recipe for the AmountSheet create-mode
  const amountFood = currentAmountItem && !isRecipe(currentAmountItem) ? currentAmountItem : undefined;
  const amountRecipe = currentAmountItem && isRecipe(currentAmountItem) ? currentAmountItem : undefined;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className={`rounded-[16px] border-[1.5px] border-separator bg-surface overflow-hidden transition-all ${
        open ? '' : 'hover:-translate-y-px hover:border-edge hover:shadow-[0_14px_30px_-18px_rgba(24,24,27,0.5)]'
      }`}
    >
      {/* Header — acts as accordion toggle (whole row, like WorkoutCard) */}
      <div
        aria-expanded={open}
        className="flex items-center gap-3 p-[15px] cursor-pointer select-none"
        onClick={editingName ? undefined : onToggle}
        onKeyDown={(e) => {
          if (!editingName && (e.key === 'Enter' || e.key === ' ')) {
            onToggle();
          }
        }}
        role="button"
        tabIndex={0}
      >
        {/* Numbered badge (design: green row badge) */}
        <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-nutrition-soft text-xs font-bold text-nutrition">
          {index + 1}
        </span>

        {/* Name + total — inline-edit or plain text */}
        <div className="min-w-0 flex-1">
          {editingName ? (
            <input
              ref={nameInputRef}
              // biome-ignore lint/a11y/noAutofocus: name field opens in editing mode on user intent
              autoFocus
              className="w-full bg-transparent font-grotesk text-[15px] font-bold tracking-[-0.01em] text-foreground outline-none border-b border-accent"
              onBlur={() => {
                commitRename().catch(() => undefined);
              }}
              onChange={(e) => setNameValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleNameKeyDown}
              value={nameValue}
            />
          ) : (
            // biome-ignore lint/a11y/noNoninteractiveElementInteractions: double-click to rename is a progressive enhancement on a display label; primary rename is in the dropdown menu
            // biome-ignore lint/a11y/noStaticElementInteractions: same as above
            <span
              className="block truncate font-grotesk text-[15px] font-bold tracking-[-0.01em] text-foreground"
              onDoubleClick={startEditing}
              title="Double-click to rename"
            >
              {meal.name}
            </span>
          )}
          <div className="mt-0.5 text-xs text-muted">
            {[`${items.length} item${items.length === 1 ? '' : 's'}`, mealTotal].filter(Boolean).join(' · ')}
          </div>
        </div>

        {/* Meal options menu — stop propagation so clicks don't toggle the accordion */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: stop-propagation wrapper around an interactive dropdown; role is on the Button inside */}
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: same as above */}
        <div
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Dropdown>
            <Button
              aria-label="Meal options"
              className="h-[30px] w-[30px] min-w-0 rounded-[9px]! text-muted/70"
              isIconOnly
              size="sm"
              variant="ghost"
            >
              <MoreHorizontal size={15} />
            </Button>
            <Dropdown.Popover>
              {/* Drive selection via the menu so it fires on pointer AND keyboard
                  activation — RAC routes Enter/Space through onAction, not the
                  item's onPress (same pattern as plan-actions.tsx). */}
              <Dropdown.Menu
                onAction={(key) => {
                  if (key === 'rename-meal') {
                    setEditingName(true);
                    setTimeout(() => nameInputRef.current?.select(), 0);
                    if (!open) {
                      onToggle();
                    }
                  } else if (key === 'delete-meal') {
                    handleDelete().catch(() => undefined);
                  }
                }}
              >
                <Dropdown.Section>
                  <Dropdown.Item
                    id="rename-meal"
                    textValue="Rename"
                  >
                    <Label>Rename</Label>
                  </Dropdown.Item>
                </Dropdown.Section>
                <Separator />
                <Dropdown.Section>
                  <Dropdown.Item
                    id="delete-meal"
                    textValue="Delete"
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
        </div>

        {/* Expand affordance (design: green "Open" tile) */}
        <span
          aria-hidden
          className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-nutrition-soft text-nutrition"
        >
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
      </div>

      {/* Body — meal items + add button */}
      {open ? (
        <div className="border-t border-separator px-3 pb-3 pt-1.5">
          {isShared ? (
            <div className="mt-1.5 rounded-[10px] border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning-soft-foreground">
              Used in {assignmentCount} places — changes apply everywhere
            </div>
          ) : null}
          {items.length === 0 ? (
            <div className="py-3 text-center text-xs text-muted">No items yet — add foods below</div>
          ) : (
            items.map((item, i) => (
              <MealItemRow
                index={i}
                key={item.id}
                ref={(el) => {
                  itemRowRefs.current[item.id] = el;
                }}
                item={item}
                onTap={() => setEditingItem(item)}
              />
            ))
          )}

          {/* Design: dashed add tile (item-level = green hover) */}
          <button
            ref={addItemButtonRef}
            className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-[13px] border-[1.5px] border-dashed border-edge-strong text-[12.5px] font-semibold text-muted transition-colors hover:border-nutrition hover:bg-nutrition-soft/50 hover:text-nutrition"
            onClick={() => setPickerOpen(true)}
            type="button"
          >
            <Plus
              size={14}
              strokeWidth={2.2}
            />
            Add food or recipe
          </button>

          {/* Meal total — rolls up live from server-recomputed meal.nutrition */}
          {meal.nutrition?.calories != null ? (
            <div className="mt-2.5 flex items-center justify-between rounded-[12px] bg-nutrition-soft/60 px-3.5 py-2.5">
              <div>
                <div className="text-[11px] font-bold text-nutrition">Meal total</div>
                <div className="font-grotesk text-sm font-bold text-foreground">
                  {Math.round(meal.nutrition.calories)} kcal
                </div>
              </div>
              <div className="text-[11px] font-semibold text-nutrition">
                {fmt(meal.nutrition.protein_g)}P · {fmt(meal.nutrition.carbs_g)}C · {fmt(meal.nutrition.fat_g)}F
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

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
    </div>
  );
}
