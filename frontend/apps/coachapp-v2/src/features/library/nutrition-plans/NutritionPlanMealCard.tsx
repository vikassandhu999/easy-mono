import {Button} from '@heroui/react';
import {ChevronDown, ChevronRight, ChevronUp, UtensilsCrossed} from 'lucide-react';

import type {Meal} from '@/entities/meals/api/meals';
import type {PlanItem} from '@/entities/nutritionPlans/api/nutritionPlans';

import {toSentenceLabel} from '@/features/library/nutrition-plans/nutritionPlanBuilderShared';

type NutritionPlanMealCardProps = {
  canMove: {down: boolean; up: boolean};
  meal: Meal | undefined;
  onMove: (direction: 'down' | 'up') => void;
  onTap: () => void;
  planItem: PlanItem;
};

const getCalories = (meal: Meal | undefined) => {
  if (!meal?.macros) return null;
  const caloriesEntry = Object.entries(meal.macros).find(([key]) => {
    const normalized = key.trim().toLowerCase();
    return normalized === 'calories' || normalized === 'kcal' || normalized === 'energy';
  });
  return caloriesEntry?.[1] ?? null;
};

export default function NutritionPlanMealCard({canMove, meal, onMove, onTap, planItem}: NutritionPlanMealCardProps) {
  const itemCount = meal?.meal_items.length ?? 0;
  const calories = getCalories(meal);
  const mealTypeLabel = toSentenceLabel(planItem.meal_type);

  return (
    <div className="flex items-center gap-1 px-2 py-1">
      <div className="flex flex-col">
        <Button
          aria-label="Move meal up"
          className="min-h-7 min-w-7"
          isDisabled={!canMove.up}
          isIconOnly
          onPress={() => onMove('up')}
          size="sm"
          variant="ghost"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          aria-label="Move meal down"
          className="min-h-7 min-w-7"
          isDisabled={!canMove.down}
          isIconOnly
          onPress={() => onMove('down')}
          size="sm"
          variant="ghost"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>
      <button
        className="flex flex-1 cursor-pointer items-center gap-3 border-none bg-transparent py-2 text-left outline-none"
        onClick={onTap}
        type="button"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
          <UtensilsCrossed className="h-4 w-4 text-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">{mealTypeLabel}</p>
          <p className="truncate text-sm font-semibold text-foreground">{meal?.name ?? 'Untitled meal'}</p>
          <p className="text-xs text-muted">
            {calories !== null ? `${Math.round(calories)} kcal` : 'No macros'} · {itemCount} item
            {itemCount === 1 ? '' : 's'}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
      </button>
    </div>
  );
}
