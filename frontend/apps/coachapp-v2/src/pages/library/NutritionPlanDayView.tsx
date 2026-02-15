import {Button, Card} from '@heroui/react';
import {Copy, Plus, Trash2} from 'lucide-react';

import type {Meal} from '@/api/meals';
import type {PlanItem} from '@/api/nutritionPlans';

import {toSentenceLabel} from '@/pages/library/nutritionPlanBuilderShared';
import NutritionPlanMealCard from '@/pages/library/NutritionPlanMealCard';

type NutritionPlanDayViewProps = {
  dayMealCount: number;
  day: string;
  mealsById: Record<string, Meal>;
  onAddMeal: (day: string) => void;
  onClearDay: (day: string) => void;
  onCopyDay: (day: string) => void;
  onDuplicateForDay: (planItem: PlanItem) => void;
  onEditAssignment: (planItem: PlanItem) => void;
  onEditMeal: (mealId: string) => void;
  onRemoveMealFromDay: (planItemId: string) => void;
  planItems: PlanItem[];
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

export default function NutritionPlanDayView({
  dayMealCount,
  day,
  mealsById,
  onAddMeal,
  onClearDay,
  onCopyDay,
  onDuplicateForDay,
  onEditAssignment,
  onEditMeal,
  onRemoveMealFromDay,
  planItems,
}: NutritionPlanDayViewProps) {
  const sortedPlanItems = [...planItems].sort((a, b) => {
    const typeSort = getPlanItemSortWeight(a.meal_type) - getPlanItemSortWeight(b.meal_type);
    if (typeSort !== 0) {
      return typeSort;
    }

    const mealA = mealsById[a.meal_id];
    const mealB = mealsById[b.meal_id];
    return (mealA?.position ?? 0) - (mealB?.position ?? 0);
  });

  return (
    <Card className="border border-separator bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{toSentenceLabel(day)}</h2>
            <p className="text-sm text-muted">
              {dayMealCount} day assignment{dayMealCount === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="min-h-11"
              onPress={() => onCopyDay(day)}
              size="sm"
              variant="outline"
            >
              <Copy className="h-4 w-4" />
              Copy day
            </Button>
            <Button
              className="min-h-11"
              isDisabled={dayMealCount === 0}
              onPress={() => onClearDay(day)}
              size="sm"
              variant="outline"
            >
              <Trash2 className="h-4 w-4" />
              Clear day
            </Button>
            <Button
              className="min-h-11"
              onPress={() => onAddMeal(day)}
              size="sm"
              variant="secondary"
            >
              <Plus className="h-4 w-4" />
              Add meal
            </Button>
          </div>
        </div>

        {sortedPlanItems.length === 0 ? (
          <Card className="border border-dashed border-separator bg-background p-5">
            <p className="text-sm text-muted">No meals scheduled yet. Add a meal to build this day.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedPlanItems.map((planItem) => (
              <NutritionPlanMealCard
                key={planItem.id}
                meal={mealsById[planItem.meal_id]}
                onDuplicateForDay={onDuplicateForDay}
                onEditAssignment={onEditAssignment}
                onEditMeal={onEditMeal}
                onRemoveFromDay={onRemoveMealFromDay}
                planItem={planItem}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
