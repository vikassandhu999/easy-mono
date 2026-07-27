/**
 * AmountSheet — the amount editor for nutrition meal items, a `ResponsiveOverlay`
 * (anchored popover on desktop, keyboard-docked sheet on mobile).
 *
 * Modes, derived from `existingItem`:
 *   CREATE — a freshly-picked Food or Recipe; posts createMealItem on confirm.
 *   EDIT   — an existing item; autosaves through a debounced coalescing queue,
 *            and a pending edit is flushed when the overlay closes (unmount).
 *
 * Foods resolve `weight_g` from a serving-size tap (weight × count) or typed
 * grams; recipes resolve via serving count. The macro preview is live: edit
 * mode scales the stored nutrition snapshot linearly, create mode mirrors the
 * backend's MacroCalc.
 */

import {computeMacrosFromSnapshot} from '@easy/utils';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import SectionHeading from '@/@components/section-heading';
import type {Food, Recipe} from '@/api/nutrition-foods';
import {useCreateMealItemMutation, useUpdateMealItemMutation} from '@/api/nutrition-plans-list';
import {createCoalescingQueue} from '@/builder-kit/coalescing-queue';
import {ResponsiveOverlay} from '@/builder-kit/responsive-overlay';
import type {HydratedMealItem} from '@/nutrition-plans/plan-builder/meal-item-row';
import {useNutritionPlanCommit} from './use-plan-commit';

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

/** What an edit-mode save writes. Every schedule passes all three keys. */
type ItemPatch = {weight_g?: number | null; amount?: number | null; unit?: string | null};

/** Long enough that a typed amount isn't sent per keystroke. */
const SAVE_DEBOUNCE_MS = 600;

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
  const createMealItemMutation = useCreateMealItemMutation();
  const updateMealItemMutation = useUpdateMealItemMutation();
  const commit = useNutritionPlanCommit(planId);
  const isCreating = createMealItemMutation.isPending;

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

  const executeSave = useCallback(
    (patch: ItemPatch) => {
      if (!existingItem) {
        return Promise.resolve(false);
      }
      return commit(
        (draft) => {
          for (const meal of draft.data.meals ?? []) {
            const target = meal.meal_items.find((mi) => mi.id === existingItem.id);
            if (target) {
              Object.assign(target, patch);
              break;
            }
          }
        },
        () => updateMealItemMutation.mutateAsync({id: existingItem.id, body: patch}),
        "Couldn't save amount",
      );
    },
    [commit, existingItem, updateMealItemMutation],
  );

  // The queue serialises saves, and its send reads `pendingRef` — so what goes
  // out is always the latest edit, never a snapshot a timer closed over.
  const pendingRef = useRef<ItemPatch | null>(null);
  const executeSaveRef = useRef(executeSave);
  executeSaveRef.current = executeSave;
  const queue = useMemo(
    () =>
      createCoalescingQueue(async () => {
        const patch = pendingRef.current;
        pendingRef.current = null;
        if (patch) {
          await executeSaveRef.current(patch);
        }
      }),
    [],
  );

  const scheduleSave = (patch: ItemPatch) => {
    pendingRef.current = patch;
    queue.mark('save', SAVE_DEBOUNCE_MS);
  };

  // Closing the overlay unmounts this content — flush the pending edit then.
  useEffect(() => () => queue.flushPending(), [queue]);

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

    // Optimistic insert — the server assigns the real id and computes the
    // nutrition snapshot; the commit's refetch reconciles.
    const provisionalItem: HydratedMealItem = {
      id: `provisional-${Date.now()}`,
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

    const ok = await commit(
      (draft) => {
        draft.data.meals?.find((m) => m.id === mealId)?.meal_items.push(provisionalItem);
      },
      () => createMealItemMutation.mutateAsync({mealId, body}),
      "Couldn't add item",
    );
    if (ok) {
      onClose();
    }
  }, [food, recipe, resolvedWeightG, servingCount, activeServingIdx, mealId, commit, createMealItemMutation, onClose]);

  // ── Render ────────────────────────────────────────────────────────────────

  const servingSizes = food?.serving_sizes ?? recipe?.serving_sizes ?? [];

  // For food mode: weight_g must resolve to enable confirm
  const canConfirm = recipe ? Number.parseFloat(servingCount) > 0 : resolvedWeightG !== null && resolvedWeightG > 0;

  return (
    <div className="w-full space-y-3">
      {/* ── Recipe mode: servings input ── */}
      {isRecipeMode ? (
        <div>
          <SectionHeading title="Servings" />
          <div className="rounded-chip border border-accent/40 bg-accent/5 px-3 pb-2 pt-1.5 text-center">
            <input
              className="w-full bg-transparent text-center type-metric font-semibold text-foreground outline-none"
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
                  'inline-flex  items-center rounded-chip border px-3 py-2 type-eyebrow font-medium transition-colors',
                  activeServingIdx === idx
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-muted hover:border-default-hover hover:text-foreground',
                ].join(' ')}
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
              <div className="rounded-chip border border-border bg-background px-3 pb-2 pt-1.5 text-center">
                <input
                  className="w-full bg-transparent text-center type-heading font-semibold text-foreground outline-none"
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
              'rounded-chip border px-3 pb-2 pt-1.5 text-center transition-colors',
              gramsInput !== '' ? 'border-accent/40 bg-accent/5' : 'border-border bg-background',
            ].join(' ')}
          >
            <input
              className="w-full bg-transparent text-center type-metric font-semibold text-foreground outline-none"
              inputMode="decimal"
              onChange={(e) => handleGramsChange(e.target.value)}
              placeholder="—"
              type="text"
              value={gramsInput}
            />
            <div className="mt-0.5 type-eyebrow text-muted">g</div>
          </div>
        </div>
      ) : null}

      {/* ── Live macro preview ── */}
      {macroPreview ? (
        <div className="flex items-center justify-between rounded-chip border border-border bg-surface-secondary/40 px-3 py-2">
          <div>
            {resolvedWeightG != null ? (
              <div className="type-eyebrow text-muted">resolves to {fmt(resolvedWeightG)}g →</div>
            ) : null}
            <div className="type-body font-bold text-foreground">{macroPreview.kcal}</div>
          </div>
          <div className="type-eyebrow text-accent">{macroPreview.macros}</div>
        </div>
      ) : (
        <div className="rounded-chip border border-border bg-surface-secondary px-3 py-2 text-center type-eyebrow text-muted">
          {isFoodMode ? 'Select a serving or enter grams to preview macros' : 'Enter servings to preview macros'}
        </div>
      )}

      {/* ── Create mode: confirm button ── */}
      {!isEditMode ? (
        <button
          className={[
            'w-full rounded-panel py-3 type-body font-semibold transition-colors',
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
          <span className="type-eyebrow text-muted">Changes save automatically</span>
          {onDelete ? (
            <button
              className="type-eyebrow font-medium text-danger-soft-foreground transition-colors hover:text-danger-soft-foreground/80"
              onClick={() => {
                // Drop any pending debounced save — the item is being removed.
                pendingRef.current = null;
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
  );
}

// ---------------------------------------------------------------------------
// AmountSheet — public component
// ---------------------------------------------------------------------------

export function AmountSheet(props: AmountSheetProps) {
  const {open, onClose, existingItem, planId, mealId, onDelete, anchorEl} = props;

  // Stable ref object pointing at the anchor — the desktop popover reads it.
  const triggerRef = useRef<HTMLElement | null>(null);
  triggerRef.current = anchorEl ?? null;

  const food = props.food ?? existingItem?.food ?? null;
  const recipe = props.recipe ?? existingItem?.recipe ?? null;

  return (
    <ResponsiveOverlay
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      title={food?.name ?? recipe?.name ?? existingItem?.name ?? 'Item'}
      triggerRef={triggerRef}
      width="w-96"
    >
      <AmountSheetContent
        existingItem={existingItem}
        food={food}
        mealId={mealId}
        onClose={onClose}
        onDelete={onDelete}
        planId={planId}
        recipe={recipe}
      />
    </ResponsiveOverlay>
  );
}
