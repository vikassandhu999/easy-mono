import {Button, Card} from '@heroui/react';
import {ArrowLeft, Copy} from 'lucide-react';
import {useLocation, useNavigate, useParams} from 'react-router';

import {useGetNutritionPlanQuery} from '@/api/nutritionPlans';
import ConfirmDialog from '@/components/ConfirmDialog';
import {getReturnTo} from '@/pages/library/libraryFormShared';
import CopyDayDialog from '@/pages/library/nutrition-plans/CopyDayDialog';
import {DAYS} from '@/pages/library/nutrition-plans/nutritionPlanBuilderShared';
import NutritionPlanDayView from '@/pages/library/nutrition-plans/NutritionPlanDayView';
import useNutritionPlanBuilderActions from '@/pages/library/nutrition-plans/useNutritionPlanBuilderActions';

export default function NutritionPlanBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id} = useParams();
  const planId = id ?? '';
  const returnTo = getReturnTo(location, '/library');

  const {
    data: planData,
    isError: isPlanError,
    isLoading: isPlanLoading,
  } = useGetNutritionPlanQuery(planId, {skip: !planId});

  const navTo = (path: string) => navigate(path, {state: {from: returnTo}});
  const {
    confirmDialog,
    copyDayDialog,
    dayActions,
    duplicatePlan,
    isDuplicatingAssignment,
    isDuplicatingPlan,
    itemActions,
    itemsByDay,
    mealsById,
    mealUsageCount,
  } = useNutritionPlanBuilderActions(planId, navTo);

  if (isPlanLoading) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <p className="text-sm text-muted">Loading nutrition plan...</p>
      </Card>
    );
  }

  if (isPlanError || !planData?.data) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <p className="font-semibold text-foreground">Could not load plan.</p>
        <p className="mt-2 text-sm text-muted">Please go back and try again.</p>
      </Card>
    );
  }

  const plan = planData.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Button
            className="min-h-11 w-fit gap-2 px-2"
            onPress={() => navigate(returnTo)}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to library
          </Button>
          <p className="text-sm text-muted">Library</p>
          <h1 className="text-2xl font-semibold md:text-3xl">{plan.name}</h1>
          <p className="max-w-2xl text-sm text-muted">
            {plan.type} plan · {plan.status} · Build and manage weekly meal schedule
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            className="min-h-11"
            onPress={() => navTo(`/library/nutrition-plans/${plan.id}/edit`)}
            size="md"
            variant="outline"
          >
            Edit metadata
          </Button>
          <Button
            className="min-h-11 gap-2"
            isDisabled={isDuplicatingPlan}
            onPress={duplicatePlan}
            size="md"
            variant="secondary"
          >
            <Copy className="h-4 w-4" />
            {isDuplicatingPlan ? 'Duplicating...' : 'Duplicate'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {DAYS.map((day) => (
          <NutritionPlanDayView
            day={day}
            dayActions={dayActions}
            itemActions={itemActions}
            key={day}
            mealsById={mealsById}
            planItems={itemsByDay[day] ?? []}
          />
        ))}
      </div>

      {isDuplicatingAssignment ? (
        <Card className="border border-separator bg-surface p-4">
          <p className="text-sm text-muted">Duplicating assignment for local day changes...</p>
        </Card>
      ) : null}

      <Card className="border border-separator bg-background p-4">
        <p className="text-sm text-muted">
          Edit meal opens full-page meal editing (global). Edit assignment opens full-page assignment editing (local).
          Used in current plan: {mealUsageCount} meals.
        </p>
      </Card>

      {confirmDialog ? <ConfirmDialog {...confirmDialog} /> : null}
      {copyDayDialog ? <CopyDayDialog {...copyDayDialog} /> : null}
    </div>
  );
}
