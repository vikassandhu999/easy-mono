/**
 * MealItemRow — one item row inside an expanded meal card.
 *
 * Redesign shape: `{name} · {amount}` on a single line, the item's kcal
 * right-aligned, and an `×` that removes the item directly (INTERACTIONS.md
 * § NB — tapping the row opens the amount sheet in edit mode instead).
 * Rows are separated by hairlines rather than an accent rule.
 */

import {Button} from '@heroui/react';
import {ChevronDown, ChevronUp, X} from 'lucide-react';
import {AS_TEXT, NO_GAP} from '@/@components/ua-defaults';
import type {Food, Recipe} from '@/api/nutrition-foods';
import type {NutritionMealItem} from '@/api/nutrition-plan-builder';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A meal item plus the `food`/`recipe` objects a hydrated cache may carry —
 *  the generated type has only the ids. */
export type HydratedMealItem = NutritionMealItem & {
  food?: Food | null;
  recipe?: Recipe | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAmount(item: HydratedMealItem): string {
  const portion = item.portion;
  if (portion.kind === 'gram' && portion.grams != null) {
    return `${portion.grams}g`;
  }
  if (portion.amount != null) {
    const unit = portion.label ?? portion.unit;
    const plural = unit && portion.amount !== 1 && !unit.endsWith('s') ? 's' : '';
    const unitStr = unit ? ` ${unit}${plural}` : '';
    return `${portion.amount}${unitStr}`;
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
  nutrients: HydratedMealItem['nutrients'],
): {kcal: string; p: string; c: string; f: string} | null {
  if (!nutrients) {
    return null;
  }
  const kcal = fmt(nutrients.calories);
  const p = fmt(nutrients.protein);
  const c = fmt(nutrients.carbohydrates);
  const f = fmt(nutrients.fat);
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
  /** Tap opens the AmountSheet in edit mode. The pressed row IS the desktop
   *  popover's anchor, so it arrives with the event — no ref registry. */
  onTap: (anchor: HTMLElement) => void;
  onMove: (direction: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
  /** `×` removes the item from the meal without opening the sheet. */
  onRemove: () => void;
  /** Collapsed meal bodies still render — only the open card carries the anchors. */
  showTestIds?: boolean;
}

export function MealItemRow({item, onTap, onMove, isFirst, isLast, onRemove, showTestIds}: MealItemRowProps) {
  const name = item.name ?? item.food?.name ?? item.recipe?.name ?? (item.food_id ? 'Food' : 'Recipe');
  const amount = formatAmount(item);
  const macro = formatMacroContribution(item.nutrients);

  return (
    <div
      className="flex items-center gap-2 border-b border-border py-2"
      data-testid={showTestIds ? 'nb-item-row' : undefined}
    >
      {/* Main tap target — "{name} · {amount}". A HeroUI Button used as a row
          imposes its own type scale on the label, so the row's text
          size/weight/colour are restated here. */}
      <Button
        className="h-auto min-w-0 flex-1 justify-start p-0 text-left type-eyebrow font-normal leading-[normal] text-foreground"
        onPress={(event) => onTap(event.target as HTMLElement)}
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
          className="shrink-0 whitespace-nowrap type-eyebrow text-muted"
          data-testid={showTestIds ? 'nb-item-kcal' : undefined}
        >
          {macro.kcal} kcal
        </span>
      ) : null}

      <Button
        aria-label={`Move ${name} up`}
        className={`shrink-0 rounded-chip bg-transparent p-0 text-muted sm:size-5.5 ${AS_TEXT} ${NO_GAP}`}
        isDisabled={isFirst}
        isIconOnly
        onPress={() => onMove(-1)}
        size="sm"
        variant="ghost"
      >
        <ChevronUp className="size-3.5" />
      </Button>
      <Button
        aria-label={`Move ${name} down`}
        className={`shrink-0 rounded-chip bg-transparent p-0 text-muted sm:size-5.5 ${AS_TEXT} ${NO_GAP}`}
        isDisabled={isLast}
        isIconOnly
        onPress={() => onMove(1)}
        size="sm"
        variant="ghost"
      >
        <ChevronDown className="size-3.5" />
      </Button>

      <Button
        aria-label={`Remove ${name}`}
        className={`  shrink-0 rounded-chip bg-transparent p-0 text-muted  sm:size-5.5   ${AS_TEXT} ${NO_GAP}`}
        data-testid={showTestIds ? 'nb-item-remove' : undefined}
        isIconOnly
        onPress={onRemove}
        size="sm"
        variant="ghost"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
