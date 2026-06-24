/**
 * MealItemRow — full-width row for a meal item in the nutrition plan builder.
 *
 * Width discipline: single 10px indent + 2px #6c8cff accent rule.
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

import type {Food} from '@/api/foods';
import type {Recipe} from '@/api/recipes';

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

function formatMacroContribution(nutrition: HydratedMealItem['nutrition']): string | null {
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
  return `${kcal} · ${p}/${c}/${f}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface MealItemRowProps {
  item: HydratedMealItem;
  onTap: () => void;
  onDelete: () => void;
}

export function MealItemRow({item, onTap, onDelete}: MealItemRowProps) {
  const name = item.name ?? item.food?.name ?? item.recipe?.name ?? (item.food_id ? 'Food' : 'Recipe');
  const amount = formatAmount(item);
  const macroLine = formatMacroContribution(item.nutrition);

  return (
    <div className="flex items-center">
      {/* 2px #6c8cff accent rule */}
      <div
        aria-hidden="true"
        className="mr-2.5 w-0.5 self-stretch rounded-full"
        style={{backgroundColor: '#6c8cff', minHeight: 36}}
      />

      {/* Main tap target */}
      <button
        className="min-w-0 flex-1 py-2 text-left transition-colors hover:opacity-80"
        onClick={onTap}
        style={{paddingLeft: 10}}
        type="button"
      >
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">{name}</span>
          {amount ? <span className="shrink-0 text-xs text-foreground-500">{amount}</span> : null}
        </div>
        {macroLine ? <div className="mt-0.5 text-[11px] text-foreground-500">{macroLine}</div> : null}
      </button>

      {/* Delete */}
      <button
        aria-label={`Remove ${name}`}
        className="ml-2 shrink-0 p-1.5 text-foreground-600 transition-colors hover:text-danger"
        onClick={onDelete}
        type="button"
      >
        ✕
      </button>
    </div>
  );
}
