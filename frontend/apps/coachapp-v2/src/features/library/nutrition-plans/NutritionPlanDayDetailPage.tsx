import {Button, Card, Dropdown, Label, Skeleton} from '@heroui/react';
import {ArrowLeft, Copy, EllipsisVertical, Plus, Trash2, UtensilsCrossed} from 'lucide-react';
import {Fragment, useMemo} from 'react';
import {useNavigate, useParams} from 'react-router';

import {useGetNutritionPlanQuery} from '@/entities/nutritionPlans/api/nutritionPlans';
import CopyDayDialog from '@/features/library/nutrition-plans/CopyDayDialog';
import {toSentenceLabel} from '@/features/library/nutrition-plans/nutritionPlanBuilderShared';
import NutritionPlanMealCard from '@/features/library/nutrition-plans/NutritionPlanMealCard';
import useNutritionPlanBuilderActions from '@/features/library/nutrition-plans/useNutritionPlanBuilderActions';
import ConfirmDialog from '@/shared/ui/feedback/ConfirmDialog';

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

export default function NutritionPlanDayDetailPage() {
  const navigate = useNavigate();
  const {day = '', id: planId = ''} = useParams();
  const backTo = `/library/nutrition-plans/${planId}/builder`;
  const addMealPath = `/library/nutrition-plans/${planId}/builder/days/${day}/meals/new`;

  const {data: planData, isLoading: isPlanLoading} = useGetNutritionPlanQuery(planId, {skip: !planId});

  const dayPath = `/library/nutrition-plans/${planId}/builder/days/${day}`;
  const navTo = (path: string) => navigate(path, {state: {from: dayPath}});
  const {confirmDialog, copyDayDialog, dayActions, itemActions, itemsByDay, mealsById} = useNutritionPlanBuilderActions(
    planId,
    navTo,
  );

  const planItems = useMemo(() => itemsByDay[day] ?? [], [itemsByDay, day]);
  const sortedPlanItems = useMemo(
    () =>
      [...planItems].sort((a, b) => {
        const typeSort = getPlanItemSortWeight(a.meal_type) - getPlanItemSortWeight(b.meal_type);
        if (typeSort !== 0) return typeSort;
        return (mealsById[a.meal_id]?.position ?? 0) - (mealsById[b.meal_id]?.position ?? 0);
      }),
    [planItems, mealsById],
  );

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

  if (isPlanLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!planData?.data) {
    return (
      <Card className="rounded-xl border border-separator bg-surface p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-foreground">Plan not found</p>
          <p className="text-sm text-muted">This plan may have been removed.</p>
          <Button
            className="min-h-11"
            onPress={() => navigate(backTo)}
            variant="secondary"
          >
            Back to plan
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header row: back + overflow menu */}
      <div className="flex items-center justify-between">
        <Button
          className="min-h-11 w-fit gap-1.5 px-2 text-muted hover:text-foreground"
          onPress={() => navigate(backTo)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
          Plan
        </Button>
        <Dropdown>
          <Dropdown.Trigger>
            <Button
              className="min-h-11 min-w-11"
              size="md"
              variant="ghost"
            >
              <EllipsisVertical className="h-5 w-5" />
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

      {/* Title area */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{toSentenceLabel(day)}</h1>
        <p className="mt-1 text-sm text-muted">
          {planItems.length} meal{planItems.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="border-t border-separator" />

      {/* Meal list */}
      {sortedPlanItems.length === 0 ? (
        <Card className="border border-dashed border-separator bg-surface p-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-secondary">
              <UtensilsCrossed className="h-8 w-8 text-muted" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">No meals scheduled</p>
              <p className="mt-1 max-w-sm text-sm text-muted">Add meals to build this day.</p>
            </div>
            <Button
              className="mt-2 min-h-11"
              onPress={() => navigate(addMealPath)}
              size="md"
              variant="primary"
            >
              <Plus className="h-4 w-4" />
              Add first meal
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-xl border border-separator bg-surface p-0">
          {sortedPlanItems.map((planItem, i) => (
            <Fragment key={planItem.id}>
              {i > 0 && <div className="border-t border-separator" />}
              <NutritionPlanMealCard
                canMove={{down: i < sortedPlanItems.length - 1, up: i > 0}}
                meal={mealsById[planItem.meal_id]}
                onMove={() => {}}
                onTap={() => itemActions.onEditMeal(planItem.meal_id)}
                planItem={planItem}
              />
            </Fragment>
          ))}
        </Card>
      )}

      <Button
        className="min-h-11 w-full"
        onPress={() => navigate(addMealPath)}
        variant="secondary"
      >
        <Plus className="h-4 w-4" />
        Add meal
      </Button>

      {confirmDialog ? <ConfirmDialog {...confirmDialog} /> : null}
      {copyDayDialog ? <CopyDayDialog {...copyDayDialog} /> : null}
    </div>
  );
}
