import {Button, Card, Dropdown, Label} from '@heroui/react';
import {Copy, EllipsisVertical, Plus, Trash2} from 'lucide-react';
import {Fragment} from 'react';

import type {Meal} from '@/entities/meals/api/meals';
import type {PlanItem} from '@/entities/nutritionPlans/api/nutritionPlans';

import {toSentenceLabel} from '@/features/library/nutrition-plans/nutritionPlanBuilderShared';
import NutritionPlanMealCard from '@/features/library/nutrition-plans/NutritionPlanMealCard';

type DayActions = {
  onAddMeal: (day: string) => void;
  onClearDay: (day: string) => void;
  onCopyDay: (day: string) => void;
};

type ItemActions = {
  onDuplicateForDay: (planItem: PlanItem) => void;
  onEditAssignment: (planItem: PlanItem) => void;
  onEditMeal: (mealId: string) => void;
  onRemoveFromDay: (planItemId: string) => void;
};

const getPlanItemSortWeight = (mealType: string) => {
  switch (mealType) {
    case 'breakfast':
      return 0;
    case 'pre_workout':
      return 1;
    case 'lunch':
      return 2;
    case 'snack':
      return 3;
    case 'post_workout':
      return 4;
    case 'dinner':
      return 5;
    default:
      return 99;
  }
};

type NutritionPlanDayViewProps = {
  day: string;
  dayActions: DayActions;
  itemActions: ItemActions;
  mealsById: Record<string, Meal>;
  planItems: PlanItem[];
};

export default function NutritionPlanDayView({
  day,
  dayActions,
  itemActions,
  mealsById,
  planItems,
}: NutritionPlanDayViewProps) {
  const sortedPlanItems = [...planItems].sort((a, b) => {
    const typeSort = getPlanItemSortWeight(a.meal_type) - getPlanItemSortWeight(b.meal_type);
    if (typeSort !== 0) return typeSort;
    return (mealsById[a.meal_id]?.position ?? 0) - (mealsById[b.meal_id]?.position ?? 0);
  });

  const handleDayAction = (key: React.Key) => {
    switch (key) {
      case 'copy':
        dayActions.onCopyDay(day);
        break;
      case 'clear':
        dayActions.onClearDay(day);
        break;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Day header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">{toSentenceLabel(day)}</h3>
          <p className="text-sm text-muted">
            {planItems.length} meal{planItems.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="min-h-9 gap-1.5"
            onPress={() => dayActions.onAddMeal(day)}
            size="sm"
            variant="secondary"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
          <Dropdown>
            <Dropdown.Trigger>
              <Button
                className="min-h-9 min-w-9"
                isIconOnly
                size="sm"
                variant="ghost"
              >
                <EllipsisVertical className="h-4 w-4" />
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Popover placement="bottom left">
              <Dropdown.Menu
                aria-label="Day actions"
                disabledKeys={planItems.length === 0 ? new Set(['clear']) : new Set()}
                onAction={handleDayAction}
              >
                <Dropdown.Item
                  id="copy"
                  textValue="Copy day"
                >
                  <Copy className="h-4 w-4" />
                  <Label>Copy day</Label>
                </Dropdown.Item>
                <Dropdown.Item
                  className="text-danger"
                  id="clear"
                  textValue="Clear day"
                >
                  <Trash2 className="h-4 w-4" />
                  <Label>Clear day</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>

      {/* Meal list */}
      {sortedPlanItems.length === 0 ? (
        <p className="py-1 text-sm text-muted">No meals scheduled.</p>
      ) : (
        <Card className="overflow-hidden rounded-xl border border-separator bg-surface p-0">
          {sortedPlanItems.map((planItem, i) => (
            <Fragment key={planItem.id}>
              {i > 0 ? <div className="border-t border-separator" /> : null}
              <NutritionPlanMealCard
                meal={mealsById[planItem.meal_id]}
                onDuplicateForDay={itemActions.onDuplicateForDay}
                onEditAssignment={itemActions.onEditAssignment}
                onEditMeal={itemActions.onEditMeal}
                onRemoveFromDay={itemActions.onRemoveFromDay}
                planItem={planItem}
              />
            </Fragment>
          ))}
        </Card>
      )}
    </div>
  );
}
