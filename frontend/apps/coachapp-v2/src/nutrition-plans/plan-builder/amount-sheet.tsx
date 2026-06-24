/**
 * AmountSheet — keyboard-docked amount editor for nutrition meal items.
 *
 * Modes:
 *   CREATE — item is a freshly-picked Food or Recipe (no existingItem). Shows
 *            "✓ Add to meal" button. Posts createMealItem on confirm.
 *   EDIT   — item is an existing HydratedMealItem. Autosaves on change with
 *            600ms debounce. Flushes pending save on close AND on unmount.
 *
 * Food flow: tap a serving size (sets weight_g = serving.weight_g × count) or
 *            type grams directly. If weight_g cannot be resolved the confirm is
 *            disabled.
 *
 * Recipe flow: enter servings count → resolves weight_g via
 *              first serving_size.weight_g if available, else sends amount/unit
 *              per the NutritionMealItemRequest shape.
 *
 * Live preview: computeMacrosFromSnapshot(food.macros per-100g, weight_g) on
 *               every keystroke — no refetch.
 *
 * Cache: optimistic insert/patch in getNutritionPlan(planId) +
 *        reconciling refetch after settle (meal.nutrition snapshots are
 *        server-computed). patch.undo() + toast.danger on failure.
 *
 * Flush pattern mirrors training set-sheet.tsx exactly:
 *   pendingPatchRef + saveTimerRef + flushPendingSave
 *   — flushed in Done handler AND in useEffect cleanup (unmount guard).
 */

import {computeMacrosFromSnapshot} from '@easy/utils';
import {toast} from '@heroui/react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';

import {api} from '@/api/base';
import type {Food, Recipe} from '@/api/generated';
import {useCreateMealItemMutation, useGetNutritionPlanQuery, useUpdateMealItemMutation} from '@/api/generated';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';
import type {HydratedMealItem} from '@/nutrition-plans/plan-builder/meal-item-row';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Create mode: pass food or recipe from the picker. */
interface CreateProps {
  food?: Food;
  recipe?: Recipe;
  existingItem?: undefined;
  planId: string;
  mealId: string;
  open: boolean;
  onClose: () => void;
}

/** Edit mode: pass an existing hydrated meal item. */
interface EditProps {
  food?: Food;
  recipe?: Recipe;
  existingItem: HydratedMealItem;
  planId: string;
  mealId: string;
  open: boolean;
  onClose: () => void;
}

export type AmountSheetProps = CreateProps | EditProps;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatMacroPreview(macros: ReturnType<typeof computeMacrosFromSnapshot>): string {
  return `${Math.round(macros.calories)} kcal · ${fmt(macros.protein)}P / ${fmt(macros.carbs)}C / ${fmt(macros.fat)}F`;
}

/**
 * Resolve weight_g from a serving-size tap.
 * serving.weight_g is per `serving.amount` of `serving.unit`.
 * Multiplied by count to get the total.
 */
function resolveServingWeight(weightG: number | null, amount: number | null, count: number): number | null {
  if (weightG == null || amount == null || amount === 0) {
    return null;
  }
  return (weightG / amount) * count;
}

// ---------------------------------------------------------------------------
// AmountSheetContent — shared inner editor
// ---------------------------------------------------------------------------

interface ContentProps {
  food: Food | null;
  recipe: Recipe | null;
  existingItem?: HydratedMealItem;
  planId: string;
  mealId: string;
  onClose: () => void;
}

function AmountSheetContent({food, recipe, existingItem, planId, mealId, onClose}: ContentProps) {
  const dispatch = useDispatch();
  const [createMealItem] = useCreateMealItemMutation();
  const [updateMealItem] = useUpdateMealItemMutation();
  const {refetch} = useGetNutritionPlanQuery({id: planId});

  const isEditMode = existingItem !== undefined;
  const isFoodMode = food !== null && !recipe;

  // ── Local state ──────────────────────────────────────────────────────────

  // Grams field (food mode — direct entry)
  const [gramsInput, setGramsInput] = useState<string>(() => {
    if (existingItem?.weight_g != null) {
      return String(existingItem.weight_g);
    }
    return '';
  });

  // Serving count (tap model — either food servings or recipe servings)
  const [servingCount, setServingCount] = useState<string>(() => {
    if (existingItem?.amount != null) {
      return String(existingItem.amount);
    }
    return '1';
  });

  // Active serving index for foods (which serving size is tapped)
  const [activeServingIdx, setActiveServingIdx] = useState<number | null>(() => {
    // Pre-select default or first serving if available
    const sizes = food?.serving_sizes ?? [];
    const defaultIdx = sizes.findIndex((s) => (s as {is_default?: boolean}).is_default);
    return sizes.length > 0 ? (defaultIdx >= 0 ? defaultIdx : 0) : null;
  });

  // ── Derived: resolved weight_g ───────────────────────────────────────────

  const resolvedWeightG = useMemo<number | null>(() => {
    if (recipe) {
      // Recipe mode: try to resolve via first serving size that has weight_g
      const sizes = recipe.serving_sizes ?? [];
      const count = Number.parseFloat(servingCount);
      if (Number.isNaN(count) || count <= 0) {
        return null;
      }
      const servingWithWeight = sizes.find((s) => s.weight_g != null && s.amount != null);
      if (servingWithWeight) {
        return resolveServingWeight(servingWithWeight.weight_g, servingWithWeight.amount, count);
      }
      // No weight_g available — will send amount/unit instead (weight_g stays null)
      return null;
    }

    // Food mode: grams field takes priority
    if (gramsInput !== '') {
      const n = Number.parseFloat(gramsInput);
      return Number.isNaN(n) || n <= 0 ? null : n;
    }

    // Serving tap
    if (activeServingIdx !== null) {
      const sizes = food?.serving_sizes ?? [];
      const serving = sizes[activeServingIdx];
      if (!serving) {
        return null;
      }
      const count = Number.parseFloat(servingCount);
      if (Number.isNaN(count) || count <= 0) {
        return null;
      }
      return resolveServingWeight(serving.weight_g, serving.amount, count);
    }

    return null;
  }, [food, recipe, gramsInput, servingCount, activeServingIdx]);

  // ── Live macro preview ───────────────────────────────────────────────────

  const macroPreview = useMemo(() => {
    // ── Edit mode: linear scaling of the stored item.nutrition snapshot ──
    // NutritionMealItem.nutrition is the server-computed absolute snapshot for
    // the item's current weight_g. Macros are LINEAR in weight, so we can
    // scale to the new weight without re-fetching the food record.
    if (isEditMode && existingItem) {
      const itemNutrition = existingItem.nutrition;
      const baseWeightG = existingItem.weight_g;
      if (!itemNutrition || baseWeightG == null || baseWeightG <= 0) {
        // No baseline to scale from — show placeholder
        return null;
      }
      const newWeightG = resolvedWeightG;
      if (newWeightG == null || newWeightG <= 0) {
        return null;
      }
      const scale = newWeightG / baseWeightG;
      const scaled = {
        calories: Math.round((itemNutrition.calories ?? 0) * scale),
        protein: Math.round((itemNutrition.protein_g ?? 0) * scale * 10) / 10,
        carbs: Math.round((itemNutrition.carbs_g ?? 0) * scale * 10) / 10,
        fat: Math.round((itemNutrition.fat_g ?? 0) * scale * 10) / 10,
      };
      return `${scaled.calories} kcal · ${scaled.protein}P / ${scaled.carbs}C / ${scaled.fat}F`;
    }

    // ── Create mode: compute from generated Food / Recipe fields ──
    if (food) {
      // Food: top-level per-100g fields. Remap to the canonical keys that
      // computeMacrosFromSnapshot's normalizeMacros expects.
      if (resolvedWeightG == null) {
        return null;
      }
      const snapshot = {
        calories_per_100g: food.calories_per_100g ?? 0,
        protein_g: food.protein_g_per_100g ?? 0,
        carbs_g: food.carbs_g_per_100g ?? 0,
        fats_g: food.fat_g_per_100g ?? 0,
      };
      const computed = computeMacrosFromSnapshot(snapshot, resolvedWeightG);
      return formatMacroPreview(computed);
    }

    if (recipe) {
      // Recipe: recipe.nutrition holds the TOTAL macros for the whole recipe
      // (summed from ingredients at their recorded weights). We derive
      // per-serving macros using recipe.servings_count (number of servings the
      // total nutrition was computed for). If servings_count is unavailable but
      // cooked_weight_g is set, fall back to a per-100g basis via
      // computeMacrosFromSnapshot. If neither is available, no preview.
      const n = recipe.nutrition;
      if (!n) {
        return null;
      }
      const servingsEntered = Number.parseFloat(servingCount);
      if (Number.isNaN(servingsEntered) || servingsEntered <= 0) {
        return null;
      }

      if ((recipe.servings_count ?? 0) > 0) {
        // Scale total nutrition by (entered / total) servings
        const scale = servingsEntered / (recipe.servings_count as number);
        const computed = {
          calories: (n.calories ?? 0) * scale,
          protein: (n.protein_g ?? 0) * scale,
          carbs: (n.carbs_g ?? 0) * scale,
          fat: (n.fat_g ?? 0) * scale,
        };
        return formatMacroPreview(computed);
      }

      if (recipe.cooked_weight_g != null && recipe.cooked_weight_g > 0 && resolvedWeightG != null) {
        // No servings_count — use cooked_weight_g as the total basis.
        // Derive per-100g values and use computeMacrosFromSnapshot.
        const perHundred = {
          calories_per_100g: ((n.calories ?? 0) / recipe.cooked_weight_g) * 100,
          protein_g: ((n.protein_g ?? 0) / recipe.cooked_weight_g) * 100,
          carbs_g: ((n.carbs_g ?? 0) / recipe.cooked_weight_g) * 100,
          fats_g: ((n.fat_g ?? 0) / recipe.cooked_weight_g) * 100,
        };
        const computed = computeMacrosFromSnapshot(perHundred, resolvedWeightG);
        return formatMacroPreview(computed);
      }

      return null;
    }

    return null;
  }, [food, recipe, resolvedWeightG, isEditMode, existingItem, servingCount]);

  // ── Save logic (edit mode) ───────────────────────────────────────────────

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatchRef = useRef<{weight_g?: number | null; amount?: number | null; unit?: string | null} | null>(null);

  const executeSave = useCallback(
    async (patch: {weight_g?: number | null; amount?: number | null; unit?: string | null}) => {
      if (!existingItem) {
        return;
      }

      // Build the optimistic item
      const optimisticItem: HydratedMealItem = {
        ...existingItem,
        ...patch,
      };

      // Optimistic write into getNutritionPlan cache
      const cachePatch = dispatch(
        api.util.updateQueryData('getNutritionPlan', {id: planId}, (draft) => {
          const meals = draft.data.meals ?? [];
          for (const meal of meals) {
            const idx = meal.meal_items.findIndex((mi) => mi.id === existingItem.id);
            if (idx !== -1) {
              meal.meal_items[idx] = {
                ...meal.meal_items[idx],
                weight_g: optimisticItem.weight_g ?? null,
                amount: optimisticItem.amount ?? null,
                unit: optimisticItem.unit ?? null,
              };
              break;
            }
          }
        }),
      );

      try {
        await updateMealItem({
          id: existingItem.id,
          nutritionMealItemRequest: {
            ...(patch.weight_g !== undefined && {weight_g: patch.weight_g}),
            ...(patch.amount !== undefined && {amount: patch.amount}),
            ...(patch.unit !== undefined && {unit: patch.unit}),
          },
        }).unwrap();
        // Reconcile: server computes meal.nutrition snapshots
        refetch().catch(() => undefined);
      } catch {
        cachePatch.undo();
        toast.danger("Couldn't save amount");
      }
    },
    [existingItem, dispatch, planId, updateMealItem, refetch],
  );

  const scheduleSave = useCallback(
    (patch: {weight_g?: number | null; amount?: number | null; unit?: string | null}) => {
      pendingPatchRef.current = patch;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(async () => {
        saveTimerRef.current = null;
        pendingPatchRef.current = null;
        await executeSave(patch);
      }, 600);
    },
    [executeSave],
  );

  // Flush any pending debounced save — call on Done press AND on unmount.
  // Guards double-fire: nulls both refs once flushed.
  const flushPendingSave = useCallback(async () => {
    if (saveTimerRef.current !== null && pendingPatchRef.current !== null) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      const patch = pendingPatchRef.current;
      pendingPatchRef.current = null;
      await executeSave(patch);
    }
  }, [executeSave]);

  // Unmount flush — prevents last edit being dropped
  useEffect(() => {
    return () => {
      flushPendingSave().catch(() => undefined);
    };
  }, [flushPendingSave]);

  // ── Field change handlers (edit mode autosave) ────────────────────────────

  const handleGramsChange = (value: string) => {
    setGramsInput(value);
    setActiveServingIdx(null); // grams field overrides serving tap
    if (isEditMode) {
      const n = Number.parseFloat(value);
      const weight = Number.isNaN(n) || n <= 0 ? null : n;
      scheduleSave({weight_g: weight, amount: null, unit: null});
    }
  };

  const handleServingTap = (idx: number) => {
    setActiveServingIdx(idx);
    setGramsInput(''); // clear grams field when a serving is tapped
    if (isEditMode) {
      const sizes = food?.serving_sizes ?? recipe?.serving_sizes ?? [];
      const serving = sizes[idx];
      if (!serving) {
        return;
      }
      const count = Number.parseFloat(servingCount) || 1;
      const wg = resolveServingWeight(serving.weight_g, serving.amount, count);
      scheduleSave({
        weight_g: wg,
        amount: count,
        unit: serving.unit,
      });
    }
  };

  const handleServingCountChange = (value: string) => {
    setServingCount(value);
    if (isEditMode) {
      const count = Number.parseFloat(value);
      if (Number.isNaN(count) || count <= 0) {
        return;
      }
      if (recipe) {
        const sizes = recipe.serving_sizes ?? [];
        const servingWithWeight = sizes.find((s) => s.weight_g != null && s.amount != null);
        const wg = servingWithWeight
          ? resolveServingWeight(servingWithWeight.weight_g, servingWithWeight.amount, count)
          : null;
        scheduleSave({weight_g: wg, amount: count, unit: 'serving'});
      } else if (activeServingIdx !== null && food) {
        const serving = food.serving_sizes[activeServingIdx];
        if (serving) {
          const wg = resolveServingWeight(serving.weight_g, serving.amount, count);
          scheduleSave({weight_g: wg, amount: count, unit: serving.unit});
        }
      }
    }
  };

  // ── Create mode confirm ───────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (resolvedWeightG == null && !recipe) {
      return; // guard: weight_g must be resolved for foods
    }

    const count = Number.parseFloat(servingCount);
    const activeServing = food && activeServingIdx !== null ? food.serving_sizes[activeServingIdx] : null;

    const body = {
      ...(food && {food_id: food.id}),
      ...(recipe && {recipe_id: recipe.id}),
      ...(resolvedWeightG != null && {weight_g: resolvedWeightG}),
      ...(recipe &&
        !resolvedWeightG && {
          amount: Number.isNaN(count) ? 1 : count,
          unit: 'serving',
        }),
      ...(activeServing && {
        amount: Number.isNaN(count) ? 1 : count,
        unit: activeServing.unit,
      }),
    };

    // Optimistic insert — create a provisional item
    const provisionalId = `provisional-${Date.now()}`;
    const provisionalItem = {
      id: provisionalId,
      food_id: food?.id ?? null,
      recipe_id: recipe?.id ?? null,
      weight_g: resolvedWeightG ?? null,
      amount: body.amount ?? null,
      unit: body.unit ?? null,
      position: 9999,
      inserted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const cachePatch = dispatch(
      api.util.updateQueryData('getNutritionPlan', {id: planId}, (draft) => {
        const meals = draft.data.meals ?? [];
        const meal = meals.find((m) => m.id === mealId);
        if (meal) {
          meal.meal_items.push(provisionalItem);
        }
      }),
    );

    try {
      await createMealItem({
        mealId,
        nutritionMealItemRequest: body,
      }).unwrap();
      // Reconcile: server assigns real id + computes nutrition snapshot
      refetch().catch(() => undefined);
      onClose();
    } catch {
      cachePatch.undo();
      toast.danger("Couldn't add item");
    }
  }, [
    food,
    recipe,
    resolvedWeightG,
    servingCount,
    activeServingIdx,
    dispatch,
    planId,
    mealId,
    createMealItem,
    refetch,
    onClose,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────

  const itemName = food?.name ?? recipe?.name ?? existingItem?.food?.name ?? existingItem?.recipe?.name ?? 'Item';
  const servingSizes = food?.serving_sizes ?? recipe?.serving_sizes ?? [];

  // For food mode: weight_g must resolve to enable confirm
  const canConfirm = recipe ? Number.parseFloat(servingCount) > 0 : resolvedWeightG !== null && resolvedWeightG > 0;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <span className="text-sm font-semibold text-foreground truncate pr-2">{itemName}</span>
        <button
          className="shrink-0 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          onClick={() => {
            flushPendingSave()
              .then(onClose)
              .catch(() => undefined);
          }}
          type="button"
        >
          Done
        </button>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* ── Recipe mode: servings input ── */}
        {recipe ? (
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-foreground-500">Servings</div>
            <div className="rounded-lg border border-primary/40 bg-primary/5 px-3 pb-2 pt-1.5 text-center">
              <input
                className="w-full bg-transparent text-center text-2xl font-semibold text-foreground outline-none"
                inputMode="decimal"
                onChange={(e) => handleServingCountChange(e.target.value)}
                placeholder="1"
                type="text"
                value={servingCount}
              />
            </div>
          </div>
        ) : null}

        {/* ── Food mode: serving-size chips ── */}
        {isFoodMode && servingSizes.length > 0 ? (
          <div>
            <div className="mb-1.5 text-[10px] uppercase tracking-wider text-foreground-500">Serving size</div>
            <div className="flex flex-wrap gap-1.5">
              {servingSizes.map((serving, idx) => (
                <button
                  className={[
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    activeServingIdx === idx
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-divider text-foreground-500 hover:border-default-400 hover:text-foreground-300',
                  ].join(' ')}
                  // eslint-disable-next-line react/no-array-index-key
                  key={idx}
                  onClick={() => handleServingTap(idx)}
                  type="button"
                >
                  {serving.amount != null ? `${serving.amount} ${serving.unit}` : serving.unit}
                  {serving.weight_g != null ? ` (${serving.weight_g}g)` : ''}
                </button>
              ))}
            </div>
            {activeServingIdx !== null ? (
              <div className="mt-2">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-foreground-500">Count</div>
                <div className="rounded-lg border border-divider bg-background px-3 pb-2 pt-1.5 text-center">
                  <input
                    className="w-full bg-transparent text-center text-xl font-semibold text-foreground outline-none"
                    inputMode="decimal"
                    onChange={(e) => handleServingCountChange(e.target.value)}
                    placeholder="1"
                    type="text"
                    value={servingCount}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Food mode: grams direct input ── */}
        {isFoodMode ? (
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-foreground-500">Or enter grams</div>
            <div
              className={[
                'rounded-lg border px-3 pb-2 pt-1.5 text-center transition-colors',
                gramsInput !== '' ? 'border-primary/40 bg-primary/5' : 'border-divider bg-background',
              ].join(' ')}
            >
              <input
                className="w-full bg-transparent text-center text-2xl font-semibold text-foreground outline-none"
                inputMode="decimal"
                onChange={(e) => handleGramsChange(e.target.value)}
                placeholder="—"
                type="text"
                value={gramsInput}
              />
              <div className="mt-0.5 text-[10px] text-foreground-600">g</div>
            </div>
          </div>
        ) : null}

        {/* ── Live macro preview ── */}
        {macroPreview ? (
          <div className="rounded-lg border border-divider bg-content2 px-3 py-2 text-center text-xs text-foreground-400">
            {macroPreview}
          </div>
        ) : (
          <div className="rounded-lg border border-divider bg-content2 px-3 py-2 text-center text-xs text-foreground-600">
            {isFoodMode ? 'Select a serving or enter grams to preview macros' : 'Enter servings to preview macros'}
          </div>
        )}

        {/* ── Create mode: confirm button ── */}
        {!isEditMode ? (
          <button
            className={[
              'w-full rounded-xl py-3 text-sm font-semibold transition-colors',
              canConfirm
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'cursor-not-allowed bg-default-200 text-foreground-500',
            ].join(' ')}
            disabled={!canConfirm}
            onClick={canConfirm ? handleCreate : undefined}
            type="button"
          >
            ✓ Add to meal
          </button>
        ) : null}

        {/* ── Edit mode hint ── */}
        {isEditMode ? (
          <div className="text-center text-[10px] text-foreground-600">Changes save automatically</div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AmountSheet — public component
// ---------------------------------------------------------------------------

export function AmountSheet(props: AmountSheetProps) {
  const {open, onClose, existingItem, planId, mealId} = props;

  // Resolve food/recipe from props.
  // In edit mode, existingItem.food/recipe are legacy-typed (HydratedMealItem
  // imports from @/api/foods|recipes) but structurally compatible for the fields
  // we access here (name, serving_sizes). The macro preview in edit mode uses
  // existingItem.nutrition (linear scaling) and never reads food.calories_per_100g,
  // so the cast is safe.
  const food = (props.food ?? (existingItem?.food as unknown as Food) ?? null) as Food | null;
  const recipe = (props.recipe ?? (existingItem?.recipe as unknown as Recipe) ?? null) as Recipe | null;

  return (
    <KeyboardSheet
      onClose={onClose}
      open={open}
    >
      {open ? (
        <AmountSheetContent
          existingItem={existingItem}
          food={food}
          mealId={mealId}
          onClose={onClose}
          planId={planId}
          recipe={recipe}
        />
      ) : null}
    </KeyboardSheet>
  );
}
