import {Button, Card, Dropdown, Label, Skeleton} from '@heroui/react';
import {ArrowLeft, ArrowUpRight, Copy, EllipsisVertical, Pencil, UserPlus, UtensilsCrossed} from 'lucide-react';
import {Fragment, useState} from 'react';
import {Link, useLocation, useNavigate, useParams} from 'react-router';

import {useGetClientQuery} from '@/entities/clients/api/clients';
import {useGetNutritionPlanQuery} from '@/entities/nutritionPlans/api/nutritionPlans';
import {getReturnTo} from '@/features/library/libraryFormShared';
import AssignNutritionPlanModal from '@/features/library/nutrition-plans/AssignNutritionPlanModal';
import CopyDayDialog from '@/features/library/nutrition-plans/CopyDayDialog';
import {NutritionDayCard} from '@/features/library/nutrition-plans/NutritionDayCard';
import {DAYS} from '@/features/library/nutrition-plans/nutritionPlanBuilderShared';
import useNutritionPlanBuilderActions from '@/features/library/nutrition-plans/useNutritionPlanBuilderActions';
import {toSentenceCase} from '@/shared/lib/format/formatHelpers';
import ConfirmDialog from '@/shared/ui/feedback/ConfirmDialog';

export default function NutritionPlanBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id} = useParams();
  const planId = id ?? '';
  const returnTo = getReturnTo(location, '/library');

  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const {
    data: planData,
    isError: isPlanError,
    isLoading: isPlanLoading,
    refetch: refetchPlan,
  } = useGetNutritionPlanQuery(planId, {skip: !planId});

  const navTo = (path: string) => navigate(path, {state: {from: returnTo}});
  const {confirmDialog, copyDayDialog, duplicatePlan, isDuplicatingPlan, itemsByDay, mealsById} =
    useNutritionPlanBuilderActions(planId, navTo);

  const plan = planData?.data;

  const {data: clientData} = useGetClientQuery(plan?.client_id ?? '', {
    skip: !plan?.client_id,
  });
  const client = clientData?.data;
  const clientName = client ? [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email : null;

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
              onPress={() => navigate(returnTo)}
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

  const isTemplate = plan.type === 'template';

  const handleAction = (key: React.Key) => {
    switch (key) {
      case 'edit':
        navTo(`/library/nutrition-plans/${plan.id}/edit`);
        break;
      case 'duplicate':
        duplicatePlan();
        break;
      case 'assign':
        setIsAssignOpen(true);
        break;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        {/* Row 1: back + actions */}
        <div className="flex items-center justify-between">
          <Button
            className="min-h-11 w-fit gap-1.5 px-2 text-muted hover:text-foreground"
            onPress={() => navigate(returnTo)}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft className="h-4 w-4" />
            Library
          </Button>

          {/* Desktop: labeled buttons */}
          <div className="hidden items-center gap-2 sm:flex">
            <Button
              className="min-h-11 gap-2"
              onPress={() => navTo(`/library/nutrition-plans/${plan.id}/edit`)}
              size="md"
              variant="outline"
            >
              <Pencil className="h-4 w-4" />
              Edit details
            </Button>
            <Button
              className="min-h-11 gap-2"
              isDisabled={isDuplicatingPlan}
              onPress={duplicatePlan}
              size="md"
              variant="ghost"
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </Button>
            {isTemplate ? (
              <Button
                className="min-h-11 gap-2"
                onPress={() => setIsAssignOpen(true)}
                size="md"
                variant="secondary"
              >
                <UserPlus className="h-4 w-4" />
                Assign
              </Button>
            ) : null}
          </div>

          {/* Mobile: overflow menu */}
          <div className="sm:hidden">
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
                  aria-label="Plan actions"
                  disabledKeys={isDuplicatingPlan ? new Set(['duplicate']) : new Set()}
                  onAction={handleAction}
                >
                  <Dropdown.Item
                    id="edit"
                    textValue="Edit details"
                  >
                    <Pencil className="h-4 w-4" />
                    <Label>Edit details</Label>
                  </Dropdown.Item>
                  <Dropdown.Item
                    id="duplicate"
                    textValue="Duplicate plan"
                  >
                    <Copy className="h-4 w-4" />
                    <Label>Duplicate plan</Label>
                  </Dropdown.Item>
                  <Dropdown.Item
                    id="assign"
                    isDisabled={!isTemplate}
                    textValue="Assign to client"
                  >
                    <UserPlus className="h-4 w-4" />
                    <Label>Assign to client</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        </div>

        {/* Row 2: plan name + status + client */}
        <div className="flex items-start justify-between gap-3 px-2">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-foreground md:text-2xl">{plan.name}</h1>
            {clientName && plan.client_id ? (
              <Link
                className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
                to={`/clients/${plan.client_id}`}
              >
                {clientName}
                <ArrowUpRight className="h-3 w-3 shrink-0" />
              </Link>
            ) : null}
          </div>
          <span className="mt-1.5 shrink-0 rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs font-medium text-muted">
            {toSentenceCase(plan.status)}
          </span>
        </div>
      </div>

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
