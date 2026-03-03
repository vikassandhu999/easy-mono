import {Button, Dropdown, Label} from '@heroui/react';
import {ChevronRight, Copy, EllipsisVertical, SquarePen, Trash2} from 'lucide-react';

import type {Meal} from '@/entities/meals/api/meals';
import type {PlanItem} from '@/entities/nutritionPlans/api/nutritionPlans';

import {toSentenceLabel} from '@/features/library/nutrition-plans/nutritionPlanBuilderShared';

type NutritionPlanMealCardProps = {
  meal: Meal | undefined;
  onDuplicateForDay: (planItem: PlanItem) => void;
  onEditAssignment: (planItem: PlanItem) => void;
  onEditMeal: (mealId: string) => void;
  onRemoveFromDay: (planItemId: string) => void;
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

export default function NutritionPlanMealCard({
  meal,
  onDuplicateForDay,
  onEditAssignment,
  onEditMeal,
  onRemoveFromDay,
  planItem,
}: NutritionPlanMealCardProps) {
  const itemCount = meal?.meal_items.length ?? 0;
  const calories = getCalories(meal);
  const mealTypeLabel = toSentenceLabel(planItem.meal_type);

  const handleAction = (key: React.Key) => {
    switch (key) {
      case 'edit-assignment':
        onEditAssignment(planItem);
        break;
      case 'duplicate':
        onDuplicateForDay(planItem);
        break;
      case 'remove':
        onRemoveFromDay(planItem.id);
        break;
    }
  };

  return (
    <div className="flex items-center">
      <button
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 border-none bg-transparent px-4 py-3 text-left outline-none transition-colors hover:bg-surface-secondary"
        onClick={() => onEditMeal(planItem.meal_id)}
        type="button"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">{mealTypeLabel}</p>
          <p className="truncate text-sm font-semibold text-foreground">{meal?.name ?? 'Untitled meal'}</p>
          <p className="text-xs text-muted">
            {calories !== null ? `${Math.round(calories)} kcal` : 'No macros'} · {itemCount} item
            {itemCount === 1 ? '' : 's'}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
      </button>

      <Dropdown>
        <Dropdown.Trigger>
          <Button
            className="mr-2 min-h-7 min-w-7"
            isIconOnly
            size="sm"
            variant="ghost"
          >
            <EllipsisVertical className="h-3.5 w-3.5" />
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom left">
          <Dropdown.Menu
            aria-label="Meal actions"
            onAction={handleAction}
          >
            <Dropdown.Item
              id="edit-assignment"
              textValue="Edit assignment"
            >
              <SquarePen className="h-4 w-4" />
              <Label>Edit assignment</Label>
            </Dropdown.Item>
            <Dropdown.Item
              id="duplicate"
              textValue="Duplicate for this day"
            >
              <Copy className="h-4 w-4" />
              <Label>Duplicate for this day</Label>
            </Dropdown.Item>
            <Dropdown.Item
              className="text-danger"
              id="remove"
              textValue="Remove"
            >
              <Trash2 className="h-4 w-4" />
              <Label>Remove</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
