/**
 * The amount editor for nutrition meal items.
 *
 * `AmountSheetContent` is the field block (serving chips · count · grams ·
 * live macro preview) in two modes derived from `existingItem`:
 *   COLLECT — a freshly-picked Food or Recipe; confirm hands the built
 *             request body up via `onCollect`. The add-items flow owns the
 *             actual POSTs and commits every picked item as one operation.
 *   EDIT    — an existing item; every change goes up through `onEditAmount`,
 *             and the item writer behind it debounces and serialises the
 *             saves. No cache access in here.
 *
 * `AmountSheet` is the edit-mode surface: an anchored popover on desktop (its
 * anchor is the tapped row, which doesn't move) and a keyboard sheet on mobile.
 * The cached meal item carries only ids, so it fetches the full food/recipe
 * first — the editor then has the same rich fields as the add flow (serving
 * chips, per-100g macros), with the stored serving preselected.
 *
 * Foods resolve `weight_g` from a serving-size tap (weight × count) or typed
 * grams; recipes resolve via serving count or typed grams. The macro preview
 * is live and falls back to linear scaling of the stored nutrition snapshot
 * when the source record can't price a weighed amount.
 */

import {computeMacrosFromSnapshot} from '@easy/utils';
import {Spinner, ToggleButton, ToggleButtonGroup} from '@heroui/react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import SectionHeading from '@/@components/section-heading';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
import type {Food, Recipe} from '@/api/nutrition-foods';
import {useGetFoodQuery, useGetRecipeQuery} from '@/api/nutrition-foods';
import {ResponsiveOverlay} from '@/builder-kit/responsive-overlay';
import {UNIT_CHIP} from '@/builder-kit/ui';
import {recipeServings} from '@/recipes/lib/recipe-math';
import {buildMealItemDraft} from '../amount-draft';
import type {ItemAmountPatch} from '../commands';
import {fmt} from '../macros';
import type {HydratedMealItem} from './meal-item-row';

/** The bordered value boxes (servings · count · grams) — one recipe, three uses. */
const AMOUNT_BOX = 'rounded-control border px-2 pb-2 pt-1.5 text-center';
const AMOUNT_INPUT = 'w-full bg-transparent text-center type-heading font-semibold text-foreground outline-none';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A replace-menu item draft, built by collect mode. */
export type MealItemDraft = ReturnType<typeof buildMealItemDraft>;

export interface AmountSheetProps {
  existingItem?: HydratedMealItem;
  open: boolean;
  onClose: () => void;
  /** Edit-mode saves — the composition root binds this to the item writer. */
  onEditAmount: (patch: ItemAmountPatch) => void;
  /** Desktop popover anchor — the tapped meal-item row. */
  anchorEl?: HTMLElement | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// A recipe's portion comes from its yield, not from a stored serving row:
// one serving = cooked_weight_g / servings_count. Null when it was never weighed.
function recipeServingWeightG(
  recipe: {cooked_weight_g: null | number; servings_count?: null | number} | null | undefined,
): null | number {
  if (!recipe?.cooked_weight_g || !recipe.servings_count) {
    return null;
  }
  return recipe.cooked_weight_g / recipe.servings_count;
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

export interface AmountSheetContentProps {
  food: Food | null;
  recipe: Recipe | null;
  existingItem?: HydratedMealItem;
  /** Edit mode: each change hands the full amount triple up; the item writer
   *  behind it owns the debounce, the optimistic patch and the request. */
  onEditAmount?: (patch: ItemAmountPatch) => void;
  /** Collect mode: submit hands the built request body up (no POST here). */
  onCollect?: (draft: MealItemDraft) => void;
  /** Collect mode: the fields render as a form with this id, so the host's
   *  dock button can `requestSubmit` it (and Enter in a field advances). */
  formId?: string;
  /** Collect mode: reports whether the current input resolves to a saveable
   *  amount — drives the host dock button's disabled state. */
  onCanConfirmChange?: (canConfirm: boolean) => void;
  /** Edit mode on desktop: the popover has no visible title, so the content
   *  carries the item name itself. Mobile gets the name from the sheet title. */
  showName?: boolean;
}

export function AmountSheetContent({
  food,
  recipe,
  existingItem,
  onEditAmount,
  onCollect,
  formId,
  onCanConfirmChange,
  showName,
}: AmountSheetContentProps) {
  const isEditMode = existingItem !== undefined;
  // Mode from ids as well as hydrated objects — edit-mode items may carry only
  // food_id/recipe_id (+ server-set name) and must still get amount controls.
  const isRecipeMode = recipe !== null || existingItem?.recipe_id != null;
  const isFoodMode = !isRecipeMode && (food !== null || existingItem?.food_id != null);

  // ── Local state — seeded from the item's STORED form ─────────────────────
  // An item is either weighed (weight_g only) or serving-based (amount + unit,
  // with weight_g derived). The editor opens on whichever form the item has:
  // a serving item preselects its serving chip and count, a weighed item
  // prefills grams. Prefilling both (the server stores both) made every
  // keystroke silently convert a "3 slices" item into raw grams.
  const storedAsServing = existingItem != null && existingItem.portion.kind === 'serving';

  // Grams field — direct weight entry
  const [gramsInput, setGramsInput] = useState<string>(() => {
    if (existingItem) {
      return !storedAsServing && existingItem.portion.grams != null ? String(existingItem.portion.grams) : '';
    }
    return '';
  });

  // Serving count (tap model — either food servings or recipe servings)
  const [servingCount, setServingCount] = useState<string>(() => {
    if (existingItem?.portion.amount != null) {
      return String(existingItem.portion.amount);
    }
    return '1';
  });

  // Active serving index for foods (which serving size is tapped)
  const [activeServingIdx, setActiveServingIdx] = useState<number | null>(() => {
    const sizes = food?.serving_sizes ?? [];
    if (existingItem) {
      if (!storedAsServing) {
        return null; // weighed — the grams field is the active input
      }
      const byUnit = sizes.findIndex(
        (s) => s.unit === existingItem.portion.unit && s.label === existingItem.portion.label,
      );
      return byUnit >= 0 ? byUnit : null;
    }
    // Create: pre-select the default (or first) serving if available.
    const defaultIdx = sizes.findIndex((s) => (s as {is_default?: boolean}).is_default);
    return sizes.length > 0 ? (defaultIdx >= 0 ? defaultIdx : 0) : null;
  });

  // ── Derived: resolved weight_g ───────────────────────────────────────────

  const resolvedWeightG = useMemo<number | null>(() => {
    // Grams field takes priority in both modes when it holds a value.
    if (gramsInput !== '') {
      const n = Number.parseFloat(gramsInput);
      return Number.isNaN(n) || n <= 0 ? null : n;
    }

    if (isRecipeMode) {
      // A recipe's portion comes from its yield: cooked_weight_g / servings_count.
      // Without a measured cooked weight there is no gram equivalent, so we send
      // amount/unit instead and leave weight_g null.
      const count = Number.parseFloat(servingCount);
      if (Number.isNaN(count) || count <= 0) {
        return null;
      }
      const perServing = recipeServingWeightG(recipe);
      return perServing == null ? null : perServing * count;
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
    // ── Hydrated Food / Recipe: the authoritative computation ──
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
      // Recipe: nutrients are TOTALS for the whole recipe (summed from
      // ingredients at their recorded weights). A weighed item scales by
      // cooked_weight_g; a servings item scales totals by entered/servings_count.
      const n = recipe.nutrients;

      if (resolvedWeightG != null && recipe.cooked_weight_g != null && recipe.cooked_weight_g > 0) {
        // Weighed serving — per-100g basis over cooked weight.
        const perHundred = {
          calories_per_100g: ((n.calories ?? 0) / recipe.cooked_weight_g) * 100,
          protein_g: ((n.protein ?? 0) / recipe.cooked_weight_g) * 100,
          carbs_g: ((n.carbohydrates ?? 0) / recipe.cooked_weight_g) * 100,
          fats_g: ((n.fat ?? 0) / recipe.cooked_weight_g) * 100,
        };
        const computed = computeMacrosFromSnapshot(perHundred, resolvedWeightG);
        return formatMacroPreview(computed);
      }

      if (gramsInput === '') {
        const servingsEntered = Number.parseFloat(servingCount);
        if (Number.isNaN(servingsEntered) || servingsEntered <= 0) {
          return null;
        }
        const scale = servingsEntered / recipeServings(recipe);
        const computed = {
          calories: (n.calories ?? 0) * scale,
          protein: (n.protein ?? 0) * scale,
          carbs: (n.carbohydrates ?? 0) * scale,
          fat: (n.fat ?? 0) * scale,
        };
        return formatMacroPreview(computed);
      }
      // Weighed entry the recipe can't price (no cooked weight) — fall through
      // to the stored-snapshot scaling below.
    }

    // ── Fallback: linear scaling of the stored item.nutrients snapshot ──
    // The snapshot is the server-computed absolute value for the item's
    // current amount; macros are LINEAR in weight/servings.
    if (isEditMode && existingItem?.nutrients) {
      const itemNutrition = existingItem.nutrients;
      let scale: number | null = null;
      if (existingItem.portion.grams != null && existingItem.portion.grams > 0) {
        if (resolvedWeightG != null && resolvedWeightG > 0) {
          scale = resolvedWeightG / existingItem.portion.grams;
        }
      } else if (existingItem.portion.amount != null && existingItem.portion.amount > 0) {
        const count = Number.parseFloat(servingCount);
        if (!Number.isNaN(count) && count > 0) {
          scale = count / existingItem.portion.amount;
        }
      }
      if (scale == null) {
        return null;
      }
      const scaled = {
        calories: Math.round((itemNutrition.calories ?? 0) * scale),
        protein: Math.round((itemNutrition.protein ?? 0) * scale * 10) / 10,
        carbs: Math.round((itemNutrition.carbohydrates ?? 0) * scale * 10) / 10,
        fat: Math.round((itemNutrition.fat ?? 0) * scale * 10) / 10,
      };
      return {
        kcal: `${scaled.calories} kcal`,
        macros: `${scaled.protein}P · ${scaled.carbs}C · ${scaled.fat}F`,
      };
    }

    return null;
  }, [food, recipe, resolvedWeightG, isEditMode, existingItem, servingCount, gramsInput]);

  // ── Field change handlers (edit mode autosave) ────────────────────────────

  const handleGramsChange = (value: string) => {
    setGramsInput(value);
    setActiveServingIdx(null); // grams field overrides serving tap
    if (isEditMode) {
      const n = Number.parseFloat(value);
      const weight = Number.isNaN(n) || n <= 0 ? null : n;
      onEditAmount?.({kind: 'gram', grams: weight, amount: null, unit: null, label: null});
    }
  };

  const handleServingTap = (idx: number) => {
    setActiveServingIdx(idx);
    setGramsInput(''); // clear grams field when a serving is tapped
    if (isEditMode) {
      const sizes = food?.serving_sizes ?? [];
      const serving = sizes[idx];
      if (!serving) {
        return;
      }
      const count = Number.parseFloat(servingCount) || 1;
      const wg = resolveServingWeight(serving.weight_g, serving.amount, count);
      onEditAmount?.({kind: 'serving', grams: wg, amount: count, unit: serving.unit, label: serving.label});
    }
  };

  const handleServingCountChange = (value: string) => {
    setServingCount(value);
    if (isRecipeMode) {
      setGramsInput(''); // typing servings takes over from a weighed entry
    }
    if (isEditMode) {
      const count = Number.parseFloat(value);
      if (Number.isNaN(count) || count <= 0) {
        return;
      }
      if (isRecipeMode) {
        const perServing = recipeServingWeightG(recipe);
        const wg = perServing == null ? null : perServing * count;
        onEditAmount?.({kind: 'serving', grams: wg ?? undefined, amount: count, unit: 'serving'});
      } else if (activeServingIdx !== null && food) {
        const serving = food.serving_sizes[activeServingIdx];
        if (serving) {
          const wg = resolveServingWeight(serving.weight_g, serving.amount, count);
          onEditAmount?.({kind: 'serving', grams: wg, amount: count, unit: serving.unit, label: serving.label});
        }
      }
    }
  };

  // ── Collect mode confirm ──────────────────────────────────────────────────

  const handleCollect = useCallback(() => {
    if (resolvedWeightG == null && !recipe) {
      return; // guard: weight_g must be resolved for foods
    }

    const activeServing = food && activeServingIdx !== null ? (food.serving_sizes[activeServingIdx] ?? null) : null;

    onCollect?.(
      buildMealItemDraft({
        activeServing,
        foodId: food?.id,
        recipeId: recipe?.id,
        resolvedWeightG,
        servingCount,
      }),
    );
  }, [food, recipe, resolvedWeightG, servingCount, activeServingIdx, onCollect]);

  // ── Render ────────────────────────────────────────────────────────────────

  const servingSizes = food?.serving_sizes ?? [];

  // For food mode: weight_g must resolve to enable confirm
  const canConfirm = recipe ? Number.parseFloat(servingCount) > 0 : resolvedWeightG !== null && resolvedWeightG > 0;

  useEffect(() => {
    onCanConfirmChange?.(canConfirm);
  }, [canConfirm, onCanConfirmChange]);

  const fields = (
    <>
      {showName && isEditMode ? (
        <div className="truncate type-body font-semibold text-foreground">
          {existingItem?.name ?? food?.name ?? recipe?.name ?? 'Item'}
        </div>
      ) : null}

      {/* ── Recipe mode: servings input ── */}
      {isRecipeMode ? (
        <div>
          <SectionHeading title="Servings" />
          <div
            className={`${AMOUNT_BOX} ${gramsInput === '' ? 'border-accent bg-accent-tint' : 'border-border bg-background'}`}
          >
            <input
              className={AMOUNT_INPUT}
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
          <ToggleButtonGroup
            aria-label="Serving size"
            className="flex flex-wrap gap-1.5"
            // Typing grams clears the selection programmatically; the user
            // switches servings rather than deselecting one.
            disallowEmptySelection
            isDetached
            onSelectionChange={(keys) => {
              const next = [...keys][0];
              if (next !== undefined) {
                handleServingTap(Number(next));
              }
            }}
            selectedKeys={activeServingIdx === null ? [] : [String(activeServingIdx)]}
            selectionMode="single"
          >
            {servingSizes.map((serving, idx) => (
              <ToggleButton
                className={UNIT_CHIP}
                id={String(idx)}
                key={String(idx)}
              >
                {serving.amount != null ? `${serving.amount} ${serving.unit}` : serving.unit}
                {serving.weight_g != null ? ` (${serving.weight_g}g)` : ''}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {activeServingIdx !== null ? (
            <div className="mt-2">
              <SectionHeading title="Count" />
              <div className={`${AMOUNT_BOX} border-border bg-background`}>
                <input
                  className={AMOUNT_INPUT}
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

      {/* ── Grams direct input — foods always; recipes when editing, so a
           weighed recipe item ("150g") stays editable as weight ── */}
      {isFoodMode || (isRecipeMode && isEditMode) ? (
        <div>
          {/* "Or" only makes sense when another amount control renders above */}
          <SectionHeading title={isRecipeMode || servingSizes.length > 0 ? 'Or enter grams' : 'Grams'} />
          <div
            className={`${AMOUNT_BOX} ${gramsInput !== '' ? 'border-accent bg-accent-tint' : 'border-border bg-background'}`}
          >
            <input
              className={AMOUNT_INPUT}
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
        <div className="flex items-center justify-between rounded-control border border-border bg-surface-secondary px-2 py-2">
          <div>
            {resolvedWeightG != null ? (
              <div className="type-eyebrow text-muted">resolves to {fmt(resolvedWeightG)}g →</div>
            ) : null}
            <div className="type-body font-bold text-foreground">{macroPreview.kcal}</div>
          </div>
          <div className="type-eyebrow text-accent">{macroPreview.macros}</div>
        </div>
      ) : (
        <div className="rounded-control border border-border bg-surface-secondary px-2 py-2 text-center type-eyebrow text-muted">
          {isFoodMode ? 'Select a serving or enter grams to preview macros' : 'Enter servings to preview macros'}
        </div>
      )}

      {/* ── Edit mode footer — removal lives on the row's ×, not in here ── */}
      {isEditMode ? <div className="pt-0.5 type-eyebrow text-muted">Changes save automatically</div> : null}
    </>
  );

  // Collect mode renders as a form so the host's dock button submits it and
  // Enter inside a field advances the queue.
  if (onCollect) {
    return (
      <form
        className="w-full space-y-3"
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          handleCollect();
        }}
      >
        {fields}
      </form>
    );
  }

  return <div className="w-full space-y-3">{fields}</div>;
}

// ---------------------------------------------------------------------------
// AmountSheet — public component
// ---------------------------------------------------------------------------

export function AmountSheet({open, onClose, existingItem, onEditAmount, anchorEl}: AmountSheetProps) {
  const isDesktop = useIsDesktop();

  // Stable ref object pointing at the anchor — the desktop popover reads it.
  const triggerRef = useRef<HTMLElement | null>(null);
  triggerRef.current = anchorEl ?? null;

  // The cached item has only ids — fetch the full record so the editor gets
  // serving sizes and per-100g macros. Usually instant (60s query cache).
  const foodId = existingItem?.food_id ?? null;
  const recipeId = existingItem?.recipe_id ?? null;
  const foodQuery = useGetFoodQuery(foodId ?? '', {enabled: open && foodId != null});
  const recipeQuery = useGetRecipeQuery(recipeId ?? '', {enabled: open && recipeId != null});
  const food = foodQuery.data?.data ?? existingItem?.food ?? null;
  const recipe = recipeQuery.data?.data ?? existingItem?.recipe ?? null;
  // Gate on the fetch so the fields mount once with the hydrated record (the
  // serving preselection is computed in state initialisers). A failed fetch
  // falls back to the grams-only editor rather than blocking.
  const hydrating = (foodId != null && foodQuery.isLoading) || (recipeId != null && recipeQuery.isLoading);

  return (
    <ResponsiveOverlay
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      title={existingItem?.name ?? food?.name ?? recipe?.name ?? 'Item'}
      triggerRef={triggerRef}
      width="w-96"
    >
      {hydrating ? (
        <div className="flex justify-center py-8">
          <Spinner size="sm" />
        </div>
      ) : (
        <AmountSheetContent
          key={existingItem?.id ?? 'item'}
          existingItem={existingItem}
          food={food}
          onEditAmount={onEditAmount}
          recipe={recipe}
          showName={isDesktop}
        />
      )}
    </ResponsiveOverlay>
  );
}
