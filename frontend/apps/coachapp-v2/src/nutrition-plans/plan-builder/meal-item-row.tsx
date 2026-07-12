/**
 * MealItemRow — food card for a meal item in the nutrition plan builder
 * (design: Coachez-Builder meal-window food card — hairline border, numbered
 * green badge, soft amount pill).
 *
 * Shows food/recipe name + amount (e.g. "Rolled Oats 80g") + per-item macro
 * contribution from item.nutrition (Task 1 server snapshot). If nutrition is
 * absent, shows amount only.
 *
 * Tap → opens AmountSheet on the item.
 *
 * The item type here is the full hydrated form: NutritionMealItem augmented
 * with the food/recipe objects that the plan-builder's cache hydration layer
 * populates. We accept a duck-typed interface rather than importing NutritionMealItem
 * from generated (which lacks food/recipe) so we can include those fields.
 */

import {forwardRef} from 'react';
import type {Food, Recipe} from '@/api/generated';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HydratedMealItem {
  id: string;
  food_id: string | null;
  recipe_id: string | null;
  /** Server-provided display name for the item (backend now sets this). */
  name?: string | null;
  food?: Food | null;
  recipe?: Recipe | null;
  weight_g: number | null;
  amount: number | null;
  unit: string | null;
  position: number;
  nutrition?: {
    calories?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    fiber_g?: number | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAmount(item: HydratedMealItem): string {
  if (item.weight_g != null) {
    return `${item.weight_g}g`;
  }
  if (item.amount != null) {
    // ponytail: naive "+s" pluralization — fine for serving/slice/piece-style
    // units (skips ones already ending in s); revisit if an irregular plural ships
    const plural = item.unit && item.amount !== 1 && !item.unit.endsWith('s') ? 's' : '';
    const unitStr = item.unit ? ` ${item.unit}${plural}` : '';
    return `${item.amount}${unitStr}`;
  }
  return '';
}

function fmt(n: number | null | undefined): string {
  if (n == null) {
    return '—';
  }
  return String(Math.round(n));
}

function formatMacroContribution(
  nutrition: HydratedMealItem['nutrition'],
): {kcal: string; p: string; c: string; f: string} | null {
  if (!nutrition) {
    return null;
  }
  const kcal = fmt(nutrition.calories);
  const p = fmt(nutrition.protein_g);
  const c = fmt(nutrition.carbs_g);
  const f = fmt(nutrition.fat_g);
  // Only show if we have at least kcal
  if (kcal === '—') {
    return null;
  }
  return {kcal, p, c, f};
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface MealItemRowProps {
  item: HydratedMealItem;
  /** Position in the meal's item list — drives the design's numbered badge. */
  index: number;
  /** Tap opens the AmountSheet, where the item can be edited or removed. */
  onTap: () => void;
}

export const MealItemRow = forwardRef<HTMLButtonElement, MealItemRowProps>(function MealItemRow(
  {item, index, onTap},
  ref,
) {
  const name = item.name ?? item.food?.name ?? item.recipe?.name ?? (item.food_id ? 'Food' : 'Recipe');
  const amount = formatAmount(item);
  const macro = formatMacroContribution(item.nutrition);

  return (
    // Design: meal-window food card — white, 1.5px hairline border, 14px radius,
    // numbered green badge, soft amount field. Whole card taps into AmountSheet;
    // ref exposes the button as the desktop popover anchor.
    <div className="mt-2 flex items-start gap-2.5 rounded-[14px] border-[1.5px] border-separator bg-surface px-3.5 py-3">
      <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-nutrition-soft text-[11px] font-bold text-nutrition">
        {index + 1}
      </span>

      <button
        ref={ref}
        className="min-w-0 flex-1 text-left transition-opacity hover:opacity-80"
        onClick={onTap}
        type="button"
      >
        <div className="truncate font-grotesk text-sm font-semibold text-foreground">{name}</div>
        {amount ? (
          <div className="mt-1.5 inline-block rounded-[9px] border border-separator bg-surface-secondary px-2.5 py-1 text-[12.5px] font-medium text-muted">
            {amount}
          </div>
        ) : null}
      </button>

      {/* Right-aligned macro contribution column */}
      {macro ? (
        <div className="shrink-0 whitespace-nowrap pl-2 text-right text-[11px] text-muted">
          <span className="font-medium text-foreground">{macro.kcal}</span> kcal
          {macro.p !== '—' || macro.c !== '—' || macro.f !== '—' ? (
            <>
              <br />
              {macro.p}P {macro.c}C {macro.f}F
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
