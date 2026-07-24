/**
 * MealItemRow — one item row inside an expanded meal card.
 *
 * Redesign shape: `{name} · {amount}` on a single line, the item's kcal
 * right-aligned, and an `×` that removes the item directly (INTERACTIONS.md
 * § NB — tapping the row opens the amount sheet in edit mode instead).
 * Rows are separated by hairlines rather than an accent rule.
 *
 * The item type here is the full hydrated form: NutritionMealItem augmented
 * with the food/recipe objects that the plan-builder's cache hydration layer
 * populates. We accept a duck-typed interface rather than importing NutritionMealItem
 * from generated (which lacks food/recipe) so we can include those fields.
 */

import {Button} from '@heroui/react';
import {X} from 'lucide-react';
import {forwardRef} from 'react';
import {AS_TEXT, NO_GAP} from '@/@components/ua-defaults';
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
  /** Tap opens the AmountSheet, where the item can be edited. */
  onTap: () => void;
  /** `×` removes the item from the meal without opening the sheet. */
  onRemove: () => void;
  /** Collapsed meal bodies still render — only the open card carries the anchors. */
  showTestIds?: boolean;
}

export const MealItemRow = forwardRef<HTMLButtonElement, MealItemRowProps>(function MealItemRow(
  {item, onTap, onRemove, showTestIds},
  ref,
) {
  const name = item.name ?? item.food?.name ?? item.recipe?.name ?? (item.food_id ? 'Food' : 'Recipe');
  const amount = formatAmount(item);
  const macro = formatMacroContribution(item.nutrition);

  return (
    <div
      className="flex items-center gap-2.5 border-b border-border py-2"
      data-testid={showTestIds ? 'nb-item-row' : undefined}
    >
      {/* Main tap target — "{name} · {amount}". Ref exposes the button as the
          desktop anchor for the edit-mode AmountSheet popover. A HeroUI Button
          used as a row imposes its own type scale on the label, so the row's
          text size/weight/colour are restated here. */}
      <Button
        className="h-auto min-h-11 min-w-0 flex-1 justify-start p-0 text-left text-pill font-normal leading-[normal] text-foreground [box-shadow:none] sm:min-h-0"
        onPress={onTap}
        ref={ref}
        variant="ghost"
      >
        <span
          className="block min-w-0 max-w-full truncate"
          data-testid={showTestIds ? 'nb-item-name' : undefined}
        >
          {name}
          {amount ? <span className="text-muted"> · {amount}</span> : null}
        </span>
      </Button>

      {macro ? (
        <span
          className="shrink-0 whitespace-nowrap text-chip text-muted"
          data-testid={showTestIds ? 'nb-item-kcal' : undefined}
        >
          {macro.kcal} kcal
        </span>
      ) : null}

      <Button
        aria-label={`Remove ${name}`}
        className={`min-h-11 min-w-11 shrink-0 rounded-mini bg-transparent p-0 text-muted [box-shadow:none] sm:size-5.5 sm:min-h-0 sm:min-w-0 ${AS_TEXT} ${NO_GAP}`}
        data-testid={showTestIds ? 'nb-item-remove' : undefined}
        isIconOnly
        onPress={onRemove}
        size="sm"
        variant="ghost"
      >
        <X className="size-3.25" />
      </Button>
    </div>
  );
});
