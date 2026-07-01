/**
 * MealItemRow — full-width row for a meal item in the nutrition plan builder.
 *
 * Width discipline: single 10px indent + 2px border-accent rule.
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
    const unitStr = item.unit ? ` ${item.unit}` : '';
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
  /** Tap opens the AmountSheet, where the item can be edited or removed. */
  onTap: () => void;
}

export function MealItemRow({item, onTap}: MealItemRowProps) {
  const name = item.name ?? item.food?.name ?? item.recipe?.name ?? (item.food_id ? 'Food' : 'Recipe');
  const amount = formatAmount(item);
  const macro = formatMacroContribution(item.nutrition);

  return (
    // 2px accent rule on the row itself; single 10px indent, content-driven height
    <div className="mt-1.75 flex items-start justify-between border-l-2 border-accent pl-2.5">
      {/* Main tap target — name + amount stacked */}
      <button
        className="min-w-0 flex-1 py-1.75 text-left transition-colors hover:opacity-80"
        onClick={onTap}
        type="button"
      >
        <div className="truncate text-xs font-semibold text-foreground">{name}</div>
        {amount ? <div className="mt-px text-[10px] text-muted">{amount}</div> : null}
      </button>

      {/* Right-aligned macro contribution column */}
      {macro ? (
        <div className="shrink-0 whitespace-nowrap py-1.75 pl-2 text-right text-[10px] text-muted">
          <span className="font-medium text-[#cde]">{macro.kcal}</span> kcal
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
}
