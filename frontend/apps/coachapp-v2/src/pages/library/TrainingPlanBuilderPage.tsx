import {Button, Card, toast} from '@heroui/react';
import {ArrowLeft, Copy, Dumbbell, Plus, Settings} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router';

import {
  useDeletePlannedWorkoutMutation,
  useDuplicateTrainingPlanMutation,
  useGetTrainingPlanQuery,
} from '@/api/trainingPlans';
import TrainingPlanDayCard from '@/components/training-plan/TrainingPlanDayCard';
import AssignTrainingPlanModal from '@/pages/library/AssignTrainingPlanModal';

export default function TrainingPlanBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id} = useParams();
  const planId = id ?? '';

  const returnTo =
    typeof location.state === 'object' &&
    location.state &&
    'from' in location.state &&
    typeof location.state.from === 'string'
      ? location.state.from
      : '/library';

  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const {
    data: planData,
    isError: isPlanError,
    isLoading: isPlanLoading,
    refetch: refetchPlan,
  } = useGetTrainingPlanQuery(planId, {skip: !planId});

  const [deletePlannedWorkout, {isLoading: isDeletingDay}] = useDeletePlannedWorkoutMutation();
  const [duplicateTrainingPlan, {isLoading: isDuplicating}] = useDuplicateTrainingPlanMutation();

  const plan = planData?.data;

  const isMutating = isDeletingDay || isDuplicating;

  const sortedWorkouts = useMemo(
    () => [...(plan?.planned_workouts ?? [])].sort((a, b) => a.day_number - b.day_number),
    [plan?.planned_workouts],
  );

  const handleDeleteDay = async (plannedWorkoutId: string) => {
    if (!planId) return;
    const confirmed = window.confirm('Delete this day?');
    if (!confirmed) return;
    try {
      await deletePlannedWorkout({id: plannedWorkoutId, planId}).unwrap();
      toast.success('Day deleted');
    } catch {
      toast.danger('Failed to delete day');
    }
  };

  const handleDuplicatePlan = async () => {
    if (!planId) return;
    try {
      const response = await duplicateTrainingPlan(planId).unwrap();
      toast.success('Plan duplicated');
      navigate(`/library/training-plans/${response.data.id}/builder`, {
        state: {from: returnTo},
      });
    } catch {
      toast.danger('Failed to duplicate plan');
    }
  };

  if (isPlanLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <p className="text-sm text-muted">Loading plan...</p>
      </div>
    );
  }

  if (isPlanError || !plan) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Card className="rounded-xl border border-separator bg-surface p-6">
          <p className="font-semibold text-foreground">Failed to load plan</p>
          <p className="mt-1 text-sm text-muted">Try again or return to library</p>
          <div className="mt-4 flex gap-2">
            <Button
              className="min-h-11"
              onPress={() => refetchPlan()}
              size="md"
              variant="outline"
            >
              Retry
            </Button>
            <Button
              className="min-h-11"
              onPress={() => navigate(returnTo)}
              size="md"
              variant="ghost"
            >
              Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Button
        className="min-h-11 w-fit gap-2 px-2"
        onPress={() => navigate(returnTo)}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="h-4 w-4" />
        Library
      </Button>

      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted">Training plan</p>
        <h1 className="text-2xl font-semibold text-foreground">{plan.name}</h1>
        <p className="text-sm text-muted">
          {plan.is_template ? 'Template' : 'Personal'} · {plan.status} · {sortedWorkouts.length} day
          {sortedWorkouts.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {plan.is_template ? (
          <Button
            className="min-h-11"
            onPress={() => setIsAssignOpen(true)}
            size="md"
            variant="primary"
          >
            Assign to client
          </Button>
        ) : null}
        <Button
          className="min-h-11"
          onPress={() =>
            navigate(`/library/training-plans/${plan.id}/edit`, {
              state: {from: returnTo},
            })
          }
          size="md"
          variant="outline"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
        <Button
          className="min-h-11"
          isDisabled={isDuplicating}
          onPress={handleDuplicatePlan}
          size="md"
          variant="ghost"
        >
          <Copy className="h-4 w-4" />
          Duplicate
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Days</p>
            <p className="text-xs text-muted">
              {sortedWorkouts.length} day
              {sortedWorkouts.length === 1 ? '' : 's'} in this plan
            </p>
          </div>
          <Button
            className="min-h-11"
            onPress={() =>
              navigate(`/library/training-plans/${planId}/builder/days/new`, {
                state: {from: location.pathname},
              })
            }
            size="sm"
            variant="primary"
          >
            <Plus className="h-4 w-4" />
            Add day
          </Button>
        </div>

        {sortedWorkouts.length === 0 ? (
          <Card className="rounded-xl border border-dashed border-separator bg-surface p-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-secondary">
                <Dumbbell className="h-6 w-6 text-muted" />
              </div>
              <div>
                <p className="font-medium text-foreground">No training days</p>
                <p className="text-sm text-muted">Add a day to start building your plan</p>
              </div>
              <Button
                className="mt-2 min-h-11"
                onPress={() =>
                  navigate(`/library/training-plans/${planId}/builder/days/new`, {
                    state: {from: location.pathname},
                  })
                }
                size="md"
                variant="primary"
              >
                <Plus className="h-4 w-4" />
                Add day
              </Button>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedWorkouts.map((plannedWorkout) => (
              <TrainingPlanDayCard
                isMutating={isMutating}
                key={plannedWorkout.id}
                onDeleteDay={handleDeleteDay}
                plannedWorkout={plannedWorkout}
              />
            ))}
          </div>
        )}
      </div>

      <AssignTrainingPlanModal
        isOpen={isAssignOpen}
        onAssigned={(assignedPlanId) => {
          navigate(`/library/training-plans/${assignedPlanId}/builder`, {
            state: {from: returnTo},
          });
        }}
        onOpenChange={setIsAssignOpen}
        plan={plan}
      />
    </div>
  );
}
