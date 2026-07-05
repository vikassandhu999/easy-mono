/**
 * AmountSheet — keyboard-docked amount editor for nutrition meal items.
 *
 * Modes:
 *   CREATE — item is a freshly-picked Food or Recipe (no existingItem). Shows
 *            "Add to meal" button. Posts createMealItem on confirm.
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
import {Popover} from '@heroui/react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {toastMutationError} from '@/@components/mutation-toast';
import SectionHeading from '@/@components/section-heading';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
import type {Food, Recipe} from '@/api/generated';
import {
  coachApi,
  useCreateMealItemMutation,
  useGetNutritionPlanQuery,
  useUpdateMealItemMutation,
} from '@/api/generated';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';
import type {HydratedMealItem} from '@/nutrition-plans/plan-builder/meal-item-row';
import {useAppDispatch} from '@/store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Mode is derived at runtime from `existingItem`:
 *   CREATE — `food` or `recipe` passed (from the picker), no `existingItem`.
 *   EDIT   — `existingItem` passed (autosaves; `onDelete` surfaces removal).
 */
export interface AmountSheetProps {
  food?: Food;
  recipe?: Recipe;
  existingItem?: HydratedMealItem;
  planId: string;
  mealId: string;
  open: boolean;
  onClose: () => void;
  /** Remove the item from the meal (edit mode only). Surfaces the delete the row no longer renders. */
  onDelete?: () => void;
  /** Desktop popover anchor — the meal-item row (edit) or "+ Add…" button (create). */
  anchorEl?: HTMLElement | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

interface MacroPreview {
  kcal: string;
  macros: string;
}

function formatMacroPreview(macros: ReturnType<typeof computeMacrosFromSnapshot>): MacroPreview {
  return {
    kcal: `${Math.round(macros.calories)} kcal`,
    macros: `${fmt(macros.protein)}P · ${fmt(macros.carbs)}C · ${fmt(macros.fat)}F`,
  };
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
  onDelete?: () => void;
}

function AmountSheetContent({food, recipe, existingItem, planId, mealId, onClose, onDelete}: ContentProps) {
  const dispatch = useAppDispatch();
  const [createMealItem, {isLoading: isCreating}] = useCreateMealItemMutation();
  const [updateMealItem] = useUpdateMealItemMutation();
  const {refetch} = useGetNutritionPlanQuery({id: planId});

  const isEditMode = existingItem !== undefined;
  // Mode from ids as well as hydrated objects — edit-mode items may carry only
  // food_id/recipe_id (+ server-set name) and must still get amount controls.
  const isRecipeMode = recipe !== null || existingItem?.recipe_id != null;
  const isFoodMode = !isRecipeMode && (food !== null || existingItem?.food_id != null);

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
    if (isRecipeMode) {
      // Recipe mode: try to resolve via first serving size that has weight_g
      const sizes = recipe?.serving_sizes ?? [];
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
  }, [food, recipe, isRecipeMode, gramsInput, servingCount, activeServingIdx]);

  // ── Live macro preview ───────────────────────────────────────────────────

  const macroPreview = useMemo(() => {
    // ── Edit mode: linear scaling of the stored item.nutrition snapshot ──
    // NutritionMealItem.nutrition is the server-computed absolute snapshot for
    // the item's current weight_g. Macros are LINEAR in weight, so we can
    // scale to the new weight without re-fetching the food record.
    if (isEditMode && existingItem) {
      const itemNutrition = existingItem.nutrition;
      if (!itemNutrition) {
        return null;
      }
      // Scale by weight when the item is weighed, else by servings (amount).
      let scale: number | null = null;
      if (existingItem.weight_g != null && existingItem.weight_g > 0) {
        if (resolvedWeightG != null && resolvedWeightG > 0) {
          scale = resolvedWeightG / existingItem.weight_g;
        }
      } else if (existingItem.amount != null && existingItem.amount > 0) {
        const count = Number.parseFloat(servingCount);
        if (!Number.isNaN(count) && count > 0) {
          scale = count / existingItem.amount;
        }
      }
      if (scale == null) {
        return null;
      }
      const scaled = {
        calories: Math.round((itemNutrition.calories ?? 0) * scale),
        protein: Math.round((itemNutrition.protein_g ?? 0) * scale * 10) / 10,
        carbs: Math.round((itemNutrition.carbs_g ?? 0) * scale * 10) / 10,
        fat: Math.round((itemNutrition.fat_g ?? 0) * scale * 10) / 10,
      };
      return {
        kcal: `${scaled.calories} kcal`,
        macros: `${scaled.protein}P · ${scaled.carbs}C · ${scaled.fat}F`,
      };
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
      // (summed from ingredients at their recorded weights). Mirrors the
      // backend's MacroCalc: a weighed item scales by cooked_weight_g; a
      // servings item scales totals by entered/servings_count (default 1).
      const n = recipe.nutrition;
      if (!n) {
        return null;
      }
      const servingsEntered = Number.parseFloat(servingCount);
      if (Number.isNaN(servingsEntered) || servingsEntered <= 0) {
        return null;
      }

      if (resolvedWeightG != null && recipe.cooked_weight_g != null && recipe.cooked_weight_g > 0) {
        // Weighed serving — per-100g basis over cooked weight.
        const perHundred = {
          calories_per_100g: ((n.calories ?? 0) / recipe.cooked_weight_g) * 100,
          protein_g: ((n.protein_g ?? 0) / recipe.cooked_weight_g) * 100,
          carbs_g: ((n.carbs_g ?? 0) / recipe.cooked_weight_g) * 100,
          fats_g: ((n.fat_g ?? 0) / recipe.cooked_weight_g) * 100,
        };
        const computed = computeMacrosFromSnapshot(perHundred, resolvedWeightG);
        return formatMacroPreview(computed);
      }

      // Servings — totals cover servings_count servings; no servings_count
      // means the recipe IS one serving.
      const totalServings = (recipe.servings_count ?? 0) > 0 ? (recipe.servings_count as number) : 1;
      const scale = servingsEntered / totalServings;
      const computed = {
        calories: (n.calories ?? 0) * scale,
        protein: (n.protein_g ?? 0) * scale,
        carbs: (n.carbs_g ?? 0) * scale,
        fat: (n.fat_g ?? 0) * scale,
      };
      return formatMacroPreview(computed);
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
        coachApi.util.updateQueryData('getNutritionPlan', {id: planId}, (draft) => {
          const meals = draft.data.meals ?? [];
          for (const meal of meals) {
            const target = meal.meal_items.find((mi) => mi.id === existingItem.id);
            if (target) {
              target.weight_g = optimisticItem.weight_g ?? null;
              target.amount = optimisticItem.amount ?? null;
              target.unit = optimisticItem.unit ?? null;
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
      } catch (e) {
        cachePatch.undo();
        toastMutationError(e, "Couldn't save amount");
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

  // Unmount flush — prevents last edit being dropped. Via ref so the cleanup
  // runs ONLY on unmount; a [flushPendingSave] dep would fire mid-debounce
  // whenever existingItem's identity changes on refetch.
  const flushRef = useRef(flushPendingSave);
  flushRef.current = flushPendingSave;
  useEffect(() => {
    return () => {
      flushRef.current().catch(() => undefined);
    };
  }, []);

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
      if (isRecipeMode) {
        const sizes = recipe?.serving_sizes ?? [];
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
      name: food?.name ?? recipe?.name ?? null,
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
      coachApi.util.updateQueryData('getNutritionPlan', {id: planId}, (draft) => {
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
    } catch (e) {
      cachePatch.undo();
      toastMutationError(e, "Couldn't add item");
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

  const itemName =
    food?.name ??
    recipe?.name ??
    existingItem?.name ??
    existingItem?.food?.name ??
    existingItem?.recipe?.name ??
    'Item';
  const servingSizes = food?.serving_sizes ?? recipe?.serving_sizes ?? [];

  // For food mode: weight_g must resolve to enable confirm
  const canConfirm = recipe ? Number.parseFloat(servingCount) > 0 : resolvedWeightG !== null && resolvedWeightG > 0;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <span className="text-sm font-semibold text-foreground truncate pr-2">{itemName}</span>
        <button
          className="shrink-0 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
          onClick={() => {
            flushPendingSave()
              .then(onClose)
              .catch(() => undefined);
          }}
          type="button"
        >
          {/* Create mode has an explicit "Add to meal" confirm below — the
              header action there only dismisses, so label it honestly. */}
          {isEditMode ? 'Done' : 'Cancel'}
        </button>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* ── Recipe mode: servings input ── */}
        {isRecipeMode ? (
          <div>
            <SectionHeading title="Servings" />
            <div className="rounded-lg border border-accent/40 bg-accent/5 px-3 pb-2 pt-1.5 text-center">
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
            <SectionHeading title="Serving size" />
            <div className="flex flex-wrap gap-1.5">
              {servingSizes.map((serving, idx) => (
                <button
                  className={[
                    'inline-flex min-h-9 items-center rounded-lg border px-3 py-2 text-[11px] font-medium transition-colors',
                    activeServingIdx === idx
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-muted hover:border-default-hover hover:text-foreground',
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
                <SectionHeading title="Count" />
                <div className="rounded-lg border border-border bg-background px-3 pb-2 pt-1.5 text-center">
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
            {/* "Or" only makes sense when serving chips render above */}
            <SectionHeading title={servingSizes.length > 0 ? 'Or enter grams' : 'Grams'} />
            <div
              className={[
                'rounded-lg border px-3 pb-2 pt-1.5 text-center transition-colors',
                gramsInput !== '' ? 'border-accent/40 bg-accent/5' : 'border-border bg-background',
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
              <div className="mt-0.5 text-[11px] text-muted">g</div>
            </div>
          </div>
        ) : null}

        {/* ── Live macro preview ── */}
        {macroPreview ? (
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface-secondary/40 px-3 py-2">
            <div>
              {resolvedWeightG != null ? (
                <div className="text-[11px] text-muted">resolves to {fmt(resolvedWeightG)}g →</div>
              ) : null}
              <div className="text-sm font-bold text-foreground">{macroPreview.kcal}</div>
            </div>
            <div className="text-[11px] text-accent">{macroPreview.macros}</div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface-secondary px-3 py-2 text-center text-xs text-muted">
            {isFoodMode ? 'Select a serving or enter grams to preview macros' : 'Enter servings to preview macros'}
          </div>
        )}

        {/* ── Create mode: confirm button ── */}
        {!isEditMode ? (
          <button
            className={[
              'w-full rounded-xl py-3 text-sm font-semibold transition-colors',
              canConfirm && !isCreating
                ? 'bg-accent text-accent-foreground hover:bg-accent-hover'
                : 'cursor-not-allowed bg-surface-secondary text-muted',
            ].join(' ')}
            disabled={!canConfirm || isCreating}
            onClick={canConfirm && !isCreating ? handleCreate : undefined}
            type="button"
          >
            {isCreating ? 'Adding to meal' : 'Add to meal'}
          </button>
        ) : null}

        {/* ── Edit mode footer: autosave hint + remove action ── */}
        {isEditMode ? (
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[11px] text-muted">Changes save automatically</span>
            {onDelete ? (
              <button
                className="text-xs font-medium text-danger transition-colors hover:text-danger/80"
                onClick={() => {
                  // Cancel any pending debounced save — the item is being removed.
                  if (saveTimerRef.current) {
                    clearTimeout(saveTimerRef.current);
                    saveTimerRef.current = null;
                    pendingPatchRef.current = null;
                  }
                  onDelete();
                }}
                type="button"
              >
                Remove from meal
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AmountSheet — public component
// ---------------------------------------------------------------------------

export function AmountSheet(props: AmountSheetProps) {
  const {open, onClose, existingItem, planId, mealId, onDelete, anchorEl} = props;
  const isDesktop = useIsDesktop();

  // Stable ref object pointing at the anchor — react-aria's Popover reads
  // `triggerRef` on Content (same wiring as SetSheet).
  const triggerRef = useRef<HTMLElement | null>(null);
  triggerRef.current = anchorEl ?? null;

  // Resolve food/recipe from props.
  // In edit mode, existingItem.food/recipe are legacy-typed (HydratedMealItem
  // imports from @/api/foods|recipes) but structurally compatible for the fields
  // we access here (name, serving_sizes). The macro preview in edit mode uses
  // existingItem.nutrition (linear scaling) and never reads food.calories_per_100g,
  // so the cast is safe.
  const food = (props.food ?? (existingItem?.food as unknown as Food) ?? null) as Food | null;
  const recipe = (props.recipe ?? (existingItem?.recipe as unknown as Recipe) ?? null) as Recipe | null;

  const content = open ? (
    <AmountSheetContent
      existingItem={existingItem}
      food={food}
      mealId={mealId}
      onClose={onClose}
      onDelete={onDelete}
      planId={planId}
      recipe={recipe}
    />
  ) : null;

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
        >
          <Popover.Dialog className="max-h-[70vh] overflow-y-auto px-4 py-3 outline-none">{content}</Popover.Dialog>
        </Popover.Content>
      </Popover>
    );
  }

  return (
    <KeyboardSheet
      onClose={onClose}
      open={open}
    >
      {content}
    </KeyboardSheet>
  );
}
