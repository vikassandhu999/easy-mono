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
import {Button, Dropdown, Label, Separator, toast} from '@heroui/react';
import {ChevronDown, ChevronRight, MoreHorizontal, TrashIcon} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';

import {api} from '@/api/base';
import type {NutritionMeal} from '@/api/generated';
import {
  useDeleteMealItemMutation,
  useDeleteMealMutation,
  useGetNutritionPlanQuery,
  useUpdateMealMutation,
} from '@/api/generated';

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
  const dispatch = useDispatch();
  const [updateMeal] = useUpdateMealMutation();
  const [deleteMeal] = useDeleteMealMutation();
  const [deleteMealItem] = useDeleteMealItemMutation();
  const {refetch} = useGetNutritionPlanQuery({id: planId});

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

  const startEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
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
      api.util.updateQueryData('getNutritionPlan', {id: planId}, (draft) => {
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
    } catch {
      patch.undo();
      setNameValue(meal.name);
      toast.danger("Couldn't save changes");
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
      api.util.updateQueryData('getNutritionPlan', {id: planId}, (draft) => {
        const idx = draft.data.meals?.findIndex((x) => x.id === meal.id) ?? -1;
        if (idx !== -1) {
          draft.data.meals?.splice(idx, 1);
        }
      }),
    );
    try {
      await deleteMeal({id: meal.id}).unwrap();
      refetch().catch(() => undefined);
    } catch {
      patch.undo();
      toast.danger("Couldn't delete meal");
    }
  }, [meal.id, planId, deleteMeal, dispatch, refetch]);

  // ---------------------------------------------------------------------------
  // Delete meal item
  // ---------------------------------------------------------------------------

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      const patch = dispatch(
        api.util.updateQueryData('getNutritionPlan', {id: planId}, (draft) => {
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
      } catch {
        patch.undo();
        toast.danger("Couldn't remove item");
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
    setCurrentAmountItem(first);
    setAmountQueue(rest);
  }, []);

  const handleAmountClose = useCallback(() => {
    // Advance to the next queued item, or clear
    if (amountQueue.length > 0) {
      const [next, ...rest] = amountQueue;
      setCurrentAmountItem(next);
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

  // Resolve food/recipe for the AmountSheet create-mode
  const amountFood = currentAmountItem && !isRecipe(currentAmountItem) ? currentAmountItem : undefined;
  const amountRecipe = currentAmountItem && isRecipe(currentAmountItem) ? currentAmountItem : undefined;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="rounded-xl border border-divider bg-content1 overflow-hidden">
      {/* Header — acts as accordion toggle */}
      <div
        aria-expanded={open}
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
        onClick={editingName ? undefined : onToggle}
        onKeyDown={(e) => {
          if (!editingName && (e.key === 'Enter' || e.key === ' ')) {
            onToggle();
          }
        }}
        role="button"
        tabIndex={0}
      >
        {/* Chevron */}
        <span className="shrink-0 text-foreground-500">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>

        {/* Name — inline-edit or plain text */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              ref={nameInputRef}
              // biome-ignore lint/a11y/noAutofocus: name field opens in editing mode on user intent
              autoFocus
              className="w-full bg-transparent text-sm font-semibold text-foreground outline-none border-b border-primary"
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
              className="text-sm font-semibold text-foreground truncate block"
              onDoubleClick={startEditing}
              title="Double-click to rename"
            >
              {meal.name}
            </span>
          )}
        </div>

        {/* Meal total badge */}
        {mealTotal ? <span className="shrink-0 text-xs text-foreground-500">{mealTotal}</span> : null}

        {/* Meal options menu — stop propagation so clicks don't toggle accordion */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: stop-propagation wrapper around an interactive dropdown */}
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: same as above */}
        <div
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Dropdown>
            <Button
              aria-label="Meal options"
              className="h-7 w-7 min-w-7"
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
      </div>

      {/* Body — meal items + add button */}
      {open ? (
        <div className="border-t border-divider pb-3 pt-1">
          {items.length === 0 ? (
            <div className="px-4 py-2 text-xs text-foreground-500">Add foods</div>
          ) : (
            items.map((item) => (
              <MealItemRow
                key={item.id}
                item={item}
                onDelete={() => {
                  handleDeleteItem(item.id).catch(() => undefined);
                }}
                onTap={() => setEditingItem(item)}
              />
            ))
          )}

          <div className="pl-2.5">
            <button
              className="mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              onClick={() => setPickerOpen(true)}
              type="button"
            >
              + Add food or recipe
            </button>
          </div>
        </div>
      ) : null}

      {/* Food/recipe picker sheet */}
      <FoodRecipePickerSheet
        onClose={() => setPickerOpen(false)}
        onPick={handlePick}
        open={pickerOpen}
      />

      {/* Amount sheet — create mode (sequenced per picked item) */}
      <AmountSheet
        food={amountFood}
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
        open={editingItem !== null}
        planId={planId}
      />
    </div>
  );
}
