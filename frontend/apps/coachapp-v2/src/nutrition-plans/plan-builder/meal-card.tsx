/**
 * MealCard — one accordion card for a nutrition meal.
 *
 * Header: inline-rename (PATCH meal, optimistic + rollback) + meal macro total
 *         from meal.nutrition (kcal + P/C/F) + chevron + delete menu.
 * Body (open only): one MealItemRow per meal_items + "Add food or recipe" button
 *         that opens FoodRecipePickerSheet (multi-select) → AmountSheet for
 *         each picked item in sequence.
 *
 * Width discipline: body adds NO nested horizontal padding around rows —
 * MealItemRow already owns its own 10px indent + 2px accent rule.
 *
 * Cache: rename/delete → optimistic updateQueryData('getNutritionPlan', {id: planId}, …)
 *        + refetch for server-recomputed nutrition snapshots; patch.undo() + toast on failure.
 */
import {Button, Dropdown, Label, Separator} from '@heroui/react';
import {ChevronDown, ChevronRight, MoreHorizontal, TrashIcon} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {toastMutationError} from '@/@components/mutation-toast';
import type {NutritionMeal} from '@/api/generated';
import {
  coachApi,
  NutritionScheduleEntry,
  useDeleteMealItemMutation,
  useDeleteMealMutation,
  useGetNutritionPlanQuery,
  useGetNutritionPlanScheduleQuery,
  useUpdateMealMutation,
} from '@/api/generated';
import {useAppDispatch} from '@/store';

import {AmountSheet} from './amount-sheet';
import type {FoodOrRecipe} from './food-recipe-picker-sheet';
import {FoodRecipePickerSheet, isRecipe} from './food-recipe-picker-sheet';
import type {HydratedMealItem} from './meal-item-row';
import {MealItemRow} from './meal-item-row';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MealCardProps {
  meal: NutritionMeal;
  planId: string;
  open: boolean;
  onToggle: () => void;
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

export function MealCard({meal, planId, open, onToggle}: MealCardProps) {
  const dispatch = useAppDispatch();
  const [updateMeal] = useUpdateMealMutation();
  const [deleteMeal] = useDeleteMealMutation();
  const [deleteMealItem] = useDeleteMealItemMutation();
  const {refetch} = useGetNutritionPlanQuery({id: planId});
  const {data: scheduleData, refetch: refetchSchedule} = useGetNutritionPlanScheduleQuery({planId});

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

  // Picker + amount-sheet state
  const [pickerOpen, setPickerOpen] = useState(false);
  // Queue of picked food/recipe items waiting to be amount-edited in sequence
  const [amountQueue, setAmountQueue] = useState<FoodOrRecipe[]>([]);
  const [currentAmountItem, setCurrentAmountItem] = useState<FoodOrRecipe | null>(null);

  // Edit-mode amount sheet state
  const [editingItem, setEditingItem] = useState<HydratedMealItem | null>(null);

  // ---------------------------------------------------------------------------
  // Rename handlers
  // ---------------------------------------------------------------------------

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
    // The backend cascades schedule entries with the meal — mirror that in the
    // schedule cache, or the slots keep pointing at a meal that no longer
    // exists (blank "Select an item" selects, ghost grid cells).
    const schedulePatch = dispatch(
      coachApi.util.updateQueryData('getNutritionPlanSchedule', {planId}, (draft) => {
        for (const slots of Object.values(draft.data ?? {})) {
          for (const [slot, entry] of Object.entries(slots ?? {})) {
            if (entry.nutrition_meal_id === meal.id) {
              delete slots[slot];
            }
          }
        }
      }),
    );
    try {
      await deleteMeal({id: meal.id}).unwrap();
      refetch().catch(() => undefined);
      refetchSchedule().catch(() => undefined);
    } catch (e) {
      patch.undo();
      schedulePatch.undo();
      toastMutationError(e, "Couldn't delete meal");
    }
  }, [meal.id, planId, deleteMeal, dispatch, refetch, refetchSchedule]);

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
  // everywhere it's assigned. Count how many schedule slots/days reference this
  // meal; warn when it's used in 2+ places. Counted from the schedule query
  // cache (not plan.schedule_entries) so schedule edits keep the count fresh.
  const scheduleMap = (scheduleData?.data ?? {}) as Record<string, Record<string, NutritionScheduleEntry>>;
  const assignmentCount = Object.values(scheduleMap).reduce(
    (n, slots) => n + Object.values(slots ?? {}).filter((entry) => entry.nutrition_meal_id === meal.id).length,
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
      className={`rounded-xl border bg-surface overflow-hidden ${
        open ? 'border-accent ring-1 ring-accent/60 shadow-[0_0_18px_rgba(108,140,255,0.13)]' : 'border-border'
      }`}
    >
      {/* Header — the toggle is a real button; total badge and menu are
          SIBLINGS of it, so no stop-propagation wrappers are needed. Rename
          lives in the menu (double-click was undiscoverable and touch-hostile). */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {editingName ? (
          <>
            <span className="shrink-0 text-muted">
              <ChevronDown size={16} />
            </span>
            <input
              ref={nameInputRef}
              // biome-ignore lint/a11y/noAutofocus: name field opens in editing mode on user intent
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none border-b border-accent"
              onBlur={() => {
                commitRename().catch(() => undefined);
              }}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={handleNameKeyDown}
              value={nameValue}
            />
          </>
        ) : (
          <button
            aria-expanded={open}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            onClick={onToggle}
            type="button"
          >
            <span className="shrink-0 text-muted">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
            <span className="min-w-0 truncate text-sm font-semibold text-foreground">{meal.name}</span>
          </button>
        )}

        {/* Meal total badge */}
        {mealTotal ? (
          <span className={`shrink-0 text-xs ${open ? 'text-accent' : 'text-muted'}`}>{mealTotal}</span>
        ) : null}

        <Dropdown>
          <Button
            aria-label="Meal options"
            className="h-9 w-9 min-w-9"
            isIconOnly
            size="sm"
            variant="ghost"
          >
            <MoreHorizontal size={15} />
          </Button>
          <Dropdown.Popover>
            {/* biome-ignore lint/suspicious/noEmptyBlockStatements: Dropdown.Menu requires onAction; individual items handle their own onPress */}
            <Dropdown.Menu onAction={() => {}}>
              <Dropdown.Section>
                <Dropdown.Item
                  id="rename-meal"
                  onPress={() => {
                    setEditingName(true);
                    setTimeout(() => nameInputRef.current?.select(), 0);
                    if (!open) {
                      onToggle();
                    }
                  }}
                  textValue="Rename"
                >
                  <Label>Rename</Label>
                </Dropdown.Item>
              </Dropdown.Section>
              <Separator />
              <Dropdown.Section>
                <Dropdown.Item
                  id="delete-meal"
                  onPress={() => {
                    handleDelete().catch(() => undefined);
                  }}
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

      {/* Body — meal items + add button */}
      {open ? (
        <div className="border-t border-border pb-3 pt-1">
          {isShared ? (
            <div className="mx-2.5 mt-2 mb-1 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
              Used in {assignmentCount} places — changes apply everywhere
            </div>
          ) : null}
          {items.length === 0 ? (
            <div className="pl-2.5 py-2 text-xs text-muted">Add foods</div>
          ) : (
            items.map((item) => (
              <MealItemRow
                key={item.id}
                item={item}
                onTap={() => setEditingItem(item)}
              />
            ))
          )}

          <div className="pl-2.5">
            <button
              className="mt-3 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
              onClick={() => setPickerOpen(true)}
              type="button"
            >
              + Add food or recipe
            </button>
          </div>

          {/* Meal total — rolls up live from server-recomputed meal.nutrition */}
          {meal.nutrition?.calories != null ? (
            <div className="mt-2.5 mx-2.5 flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 px-3 py-2">
              <div>
                <div className="text-[11px] text-muted">Meal total</div>
                <div className="text-sm font-bold text-foreground">{Math.round(meal.nutrition.calories)} kcal</div>
              </div>
              <div className="text-[11px] text-accent">
                {fmt(meal.nutrition.protein_g)}P · {fmt(meal.nutrition.carbs_g)}C · {fmt(meal.nutrition.fat_g)}F
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Food/recipe picker sheet */}
      <FoodRecipePickerSheet
        mealName={meal.name}
        onClose={() => setPickerOpen(false)}
        onPick={handlePick}
        open={pickerOpen}
      />

      {/* Amount sheet — create mode (sequenced per picked item). key by the
          current item so each queued food/recipe remounts with fresh state
          instead of carrying the previous item's grams/serving selection. */}
      <AmountSheet
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
