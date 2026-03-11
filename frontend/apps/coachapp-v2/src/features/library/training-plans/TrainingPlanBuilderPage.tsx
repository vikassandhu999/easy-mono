import {Button, Card, Skeleton} from '@heroui/react';
import {useLocation, useNavigate, useParams} from '@tanstack/react-router';
import {Dumbbell, Plus} from 'lucide-react';
import {Fragment} from 'react';

import {getReturnTo} from '@/features/library/libraryFormShared';
import PlanBuilderHeader from '@/features/library/shared/PlanBuilderHeader';
import AddWorkoutModal from '@/features/library/training-plans/AddWorkoutModal';
import AssignTrainingPlanModal from '@/features/library/training-plans/AssignTrainingPlanModal';
import useTrainingPlanBuilder from '@/features/library/training-plans/useTrainingPlanBuilder';
import {WorkoutDayCard} from '@/features/library/training-plans/WorkoutDayCard';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const getDayLabel = (dayNumber: number): string => DAY_LABELS[(dayNumber - 1) % 7] ?? 'Day';

export default function TrainingPlanBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id} = useParams({strict: false});
  const planId = id ?? '';
  const returnTo = getReturnTo(location.state, '/library');

  const {
    clientDisplay,
    handleAddWorkout,
    handleDuplicatePlan,
    isAddingDay,
    isAssignOpen,
    isCreatingDay,
    isDuplicating,
    isPlanError,
    isPlanLoading,
    nextDayIndex,
    plan,
    refetchPlan,
    setIsAddingDay,
    setIsAssignOpen,
    sortedWorkouts,
  } = useTrainingPlanBuilder({
    onDuplicated: (newId) => navigate({to: `/library/training-plans/${newId}/builder`, state: {from: returnTo}}),
    planId,
  });

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
            <Dumbbell className="h-7 w-7 text-muted" />
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
          onDuplicate: handleDuplicatePlan,
          onNavigateBack: () => navigate({to: returnTo}),
          onNavigateEdit: () => navigate({to: `/library/training-plans/${plan.id}/edit`, state: {from: returnTo}}),
        }}
        client={clientDisplay}
        isDuplicating={isDuplicating}
        isTemplate={plan.is_template}
        plan={plan}
      />

      <div className="border-t border-separator" />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-foreground">Schedule</p>
          <p className="text-sm text-muted">
            {sortedWorkouts.length > 0
              ? `${sortedWorkouts.length} workout${sortedWorkouts.length === 1 ? '' : 's'}`
              : 'No workouts yet'}
          </p>
        </div>
        <Button
          className="min-h-11"
          onPress={() => setIsAddingDay(true)}
          size="sm"
          variant="secondary"
        >
          <Plus className="h-4 w-4" />
          Add workout
        </Button>
      </div>

      {sortedWorkouts.length === 0 ? (
        <Card className="border border-dashed border-separator bg-surface p-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-secondary">
              <Dumbbell className="h-8 w-8 text-muted" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">No workouts yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted">Start building your plan by adding workouts.</p>
            </div>
            <Button
              className="mt-2 min-h-11"
              onPress={() => setIsAddingDay(true)}
              size="md"
              variant="secondary"
            >
              <Plus className="h-4 w-4" />
              Add first workout
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-xl border border-separator bg-surface p-0">
          {sortedWorkouts.map((pw, index) => (
            <Fragment key={pw.id}>
              {index > 0 ? <div className="border-t border-separator" /> : null}
              <WorkoutDayCard
                dayLabel={getDayLabel(pw.day_number)}
                plannedWorkout={pw}
              />
            </Fragment>
          ))}
        </Card>
      )}

      <AddWorkoutModal
        defaultDayIndex={nextDayIndex}
        isAdding={isCreatingDay}
        isOpen={isAddingDay}
        onAdd={handleAddWorkout}
        onOpenChange={setIsAddingDay}
      />

      <AssignTrainingPlanModal
        isOpen={isAssignOpen}
        onAssigned={(assignedId) =>
          navigate({to: `/library/training-plans/${assignedId}/builder`, state: {from: returnTo}})
        }
        onOpenChange={setIsAssignOpen}
        plan={plan}
      />
    </div>
  );
}
