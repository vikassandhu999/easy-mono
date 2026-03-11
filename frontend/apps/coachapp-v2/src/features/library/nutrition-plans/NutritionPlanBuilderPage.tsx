import {Button, Card, Skeleton} from '@heroui/react';
import {useLocation, useNavigate, useParams} from '@tanstack/react-router';
import {UtensilsCrossed} from 'lucide-react';
import {Fragment, useState} from 'react';

import {useGetClientQuery} from '@/entities/clients/api/clients';
import {useGetNutritionPlanQuery} from '@/entities/nutritionPlans/api/nutritionPlans';
import {getReturnTo} from '@/features/library/libraryFormShared';
import AssignNutritionPlanModal from '@/features/library/nutrition-plans/AssignNutritionPlanModal';
import CopyDayDialog from '@/features/library/nutrition-plans/CopyDayDialog';
import {NutritionDayCard} from '@/features/library/nutrition-plans/NutritionDayCard';
import {DAYS} from '@/features/library/nutrition-plans/nutritionPlanBuilderShared';
import useNutritionPlanBuilderActions from '@/features/library/nutrition-plans/useNutritionPlanBuilderActions';
import PlanBuilderHeader from '@/features/library/shared/PlanBuilderHeader';
import ConfirmDialog from '@/shared/ui/feedback/ConfirmDialog';

export default function NutritionPlanBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id} = useParams({strict: false});
  const planId = id ?? '';
  const returnTo = getReturnTo(location.state, '/library');

  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const {
    data: planData,
    isError: isPlanError,
    isLoading: isPlanLoading,
    refetch: refetchPlan,
  } = useGetNutritionPlanQuery(planId, {skip: !planId});

  const navTo = (path: string) => navigate({to: path, state: {from: returnTo}});
  const {confirmDialog, copyDayDialog, duplicatePlan, isDuplicatingPlan, itemsByDay, mealsById} =
    useNutritionPlanBuilderActions(planId, navTo);

  const plan = planData?.data;

  const {data: clientData} = useGetClientQuery(plan?.client_id ?? '', {
    skip: !plan?.client_id,
  });
  const client = clientData?.data;
  const clientDisplay = client
    ? {id: client.id, name: [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email}
    : null;

  const totalAssignments = Object.values(itemsByDay).reduce((sum, items) => sum + items.length, 0);

  if (isPlanLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-48 rounded-md" />
        </div>
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    );
  }

  if (isPlanError || !plan) {
    return (
      <Card className="border border-separator bg-surface p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
            <UtensilsCrossed className="h-7 w-7 text-muted" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">Failed to load plan</p>
            <p className="mt-1 text-sm text-muted">Something went wrong. Try again or return to library.</p>
          </div>
          <div className="flex gap-2">
            <Button
              className="min-h-11"
              onPress={() => refetchPlan()}
              size="md"
              variant="secondary"
            >
              Retry
            </Button>
            <Button
              className="min-h-11"
              onPress={() => navigate({to: returnTo})}
              size="md"
              variant="ghost"
            >
              Back to library
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PlanBuilderHeader
        actions={{
          onAssign: () => setIsAssignOpen(true),
          onDuplicate: duplicatePlan,
          onNavigateBack: () => navigate({to: returnTo}),
          onNavigateEdit: () => navTo(`/library/nutrition-plans/${plan.id}/edit`),
        }}
        client={clientDisplay}
        isDuplicating={isDuplicatingPlan}
        isTemplate={plan.type === 'template'}
        plan={plan}
      />

      <div className="border-t border-separator" />

      <div>
        <p className="text-base font-semibold text-foreground">Weekly schedule</p>
        <p className="text-sm text-muted">
          {totalAssignments} meal assignment{totalAssignments === 1 ? '' : 's'} across 7 days
        </p>
      </div>

      {totalAssignments === 0 ? (
        <Card className="border border-dashed border-separator bg-surface p-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-secondary">
              <UtensilsCrossed className="h-8 w-8 text-muted" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">No meals yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Tap on a day to start adding meals to your nutrition plan.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-xl border border-separator bg-surface p-0">
        {DAYS.map((day, i) => (
          <Fragment key={day}>
            {i > 0 ? <div className="border-t border-separator" /> : null}
            <NutritionDayCard
              day={day}
              mealsById={mealsById}
              planId={planId}
              planItems={itemsByDay[day] ?? []}
            />
          </Fragment>
        ))}
      </Card>

      {confirmDialog ? <ConfirmDialog {...confirmDialog} /> : null}
      {copyDayDialog ? <CopyDayDialog {...copyDayDialog} /> : null}

      <AssignNutritionPlanModal
        isOpen={isAssignOpen}
        onAssigned={(assignedId) => navTo(`/library/nutrition-plans/${assignedId}/builder`)}
        onOpenChange={setIsAssignOpen}
        plan={plan}
      />
    </div>
  );
}
