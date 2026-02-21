import {Button, Card, Input, Skeleton, toast} from '@heroui/react';
import {ArrowLeft, Calendar, Copy, Dumbbell, Layers, Plus, Settings, X} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router';

import {
  useCreatePlannedWorkoutMutation,
  useDeletePlannedWorkoutMutation,
  useDuplicateTrainingPlanMutation,
  useGetTrainingPlanQuery,
} from '@/api/trainingPlans';
import ConfirmDialog from '@/components/ConfirmDialog';
import TrainingPlanDayCard from '@/components/training-plan/TrainingPlanDayCard';
import AssignTrainingPlanModal from '@/pages/library/AssignTrainingPlanModal';
import {getReturnTo} from '@/pages/library/libraryFormShared';
import {toSentenceCase} from '@/pages/library/libraryShared';

export default function TrainingPlanBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id} = useParams();
  const planId = id ?? '';
  const returnTo = getReturnTo(location, '/library');

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAddingDay, setIsAddingDay] = useState(false);
  const [newDayName, setNewDayName] = useState('');
  const [workoutToDelete, setWorkoutToDelete] = useState<null | string>(null);
  const addDayInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAddingDay) addDayInputRef.current?.focus();
  }, [isAddingDay]);

  const {
    data: planData,
    isError: isPlanError,
    isLoading: isPlanLoading,
    refetch: refetchPlan,
  } = useGetTrainingPlanQuery(planId, {skip: !planId});

  const [deletePlannedWorkout, {isLoading: isDeletingDay}] = useDeletePlannedWorkoutMutation();
  const [duplicateTrainingPlan, {isLoading: isDuplicating}] = useDuplicateTrainingPlanMutation();
  const [createPlannedWorkout, {isLoading: isCreatingDay}] = useCreatePlannedWorkoutMutation();

  const plan = planData?.data;
  const isMutating = isDeletingDay || isDuplicating;
  const sortedWorkouts = useMemo(
    () => [...(plan?.planned_workouts ?? [])].sort((a, b) => a.day_number - b.day_number),
    [plan?.planned_workouts],
  );
  const nextDayNumber = sortedWorkouts.length > 0 ? Math.max(...sortedWorkouts.map((w) => w.day_number)) + 1 : 1;

  const handleDeleteDay = (plannedWorkoutId: string) => {
    if (!planId) return;
    setWorkoutToDelete(plannedWorkoutId);
  };

  const confirmDeleteDay = async () => {
    if (!workoutToDelete) return;
    const id = workoutToDelete;
    setWorkoutToDelete(null);
    try {
      await deletePlannedWorkout({id, planId}).unwrap();
      toast.success('Workout deleted');
    } catch {
      toast.danger('Failed to delete workout');
    }
  };

  const handleDuplicatePlan = async () => {
    if (!planId) return;
    try {
      const res = await duplicateTrainingPlan(planId).unwrap();
      toast.success('Plan duplicated');
      navigate(`/library/training-plans/${res.data.id}/builder`, {state: {from: returnTo}});
    } catch {
      toast.danger('Failed to duplicate plan');
    }
  };

  const handleAddDay = async () => {
    if (!newDayName.trim()) return;
    try {
      await createPlannedWorkout({body: {day_number: nextDayNumber, name: newDayName.trim()}, planId}).unwrap();
      toast.success('Workout added');
      setNewDayName('');
      setIsAddingDay(false);
    } catch {
      toast.danger('Failed to add workout');
    }
  };

  const openAddForm = () => {
    setIsAddingDay(true);
    setNewDayName('');
  };

  if (isPlanLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-48 rounded-md" />
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (isPlanError || !plan) {
    return (
      <Card className="border border-separator bg-surface p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
            <Layers className="h-7 w-7 text-muted" />
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

  return (
    <div className="flex flex-col gap-6">
      <Button
        className="min-h-9 w-fit gap-2 px-2 text-muted hover:text-foreground"
        onPress={() => navigate(returnTo)}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="h-4 w-4" />
        Library
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted">Training plan</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{plan.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs font-medium text-muted">
              {toSentenceCase(plan.status)}
            </span>
            <span className="inline-flex items-center gap-1 text-sm text-muted">
              <Layers className="h-3.5 w-3.5" />
              {plan.is_template ? 'Template' : 'Personal'}
            </span>
            <span className="text-sm text-muted">·</span>
            <span className="inline-flex items-center gap-1 text-sm text-muted">
              <Calendar className="h-3.5 w-3.5" />
              {sortedWorkouts.length} workout{sortedWorkouts.length === 1 ? '' : 's'}
            </span>
          </div>
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
            onPress={() => navigate(`/library/training-plans/${plan.id}/edit`, {state: {from: returnTo}})}
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
      </div>

      <div className="border-t border-separator" />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-foreground">Workouts</p>
          <p className="text-sm text-muted">
            {sortedWorkouts.length} workout{sortedWorkouts.length === 1 ? '' : 's'} in this plan
          </p>
        </div>
        <Button
          className="min-h-11"
          onPress={openAddForm}
          size="sm"
          variant="secondary"
        >
          <Plus className="h-4 w-4" />
          Add workout
        </Button>
      </div>

      {isAddingDay ? (
        <Card className="border-2 border-dashed border-separator bg-surface p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-secondary text-foreground">
              <span className="text-sm font-bold">{nextDayNumber}</span>
            </div>
            <Input
              className="min-h-10 flex-1"
              onChange={(e) => setNewDayName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddDay();
                if (e.key === 'Escape') setIsAddingDay(false);
              }}
              placeholder="Workout name, e.g. Push Day, Leg Day..."
              ref={addDayInputRef}
              value={newDayName}
              variant="secondary"
            />
            <Button
              className="min-h-10"
              isDisabled={isCreatingDay || !newDayName.trim()}
              onPress={handleAddDay}
              size="sm"
              variant="secondary"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
            <Button
              className="min-h-10 min-w-10"
              isIconOnly
              onPress={() => setIsAddingDay(false)}
              size="sm"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ) : null}

      {sortedWorkouts.length === 0 && !isAddingDay ? (
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
              onPress={openAddForm}
              size="md"
              variant="secondary"
            >
              <Plus className="h-4 w-4" />
              Add first workout
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedWorkouts.map((pw) => (
            <TrainingPlanDayCard
              isMutating={isMutating}
              key={pw.id}
              onDeleteDay={handleDeleteDay}
              plannedWorkout={pw}
            />
          ))}
        </div>
      )}

      <AssignTrainingPlanModal
        isOpen={isAssignOpen}
        onAssigned={(assignedId) =>
          navigate(`/library/training-plans/${assignedId}/builder`, {state: {from: returnTo}})
        }
        onOpenChange={setIsAssignOpen}
        plan={plan}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Delete this workout? This cannot be undone."
        isLoading={isDeletingDay}
        isOpen={workoutToDelete !== null}
        onConfirm={confirmDeleteDay}
        onOpenChange={(open) => {
          if (!open) setWorkoutToDelete(null);
        }}
        title="Delete workout"
      />
    </div>
  );
}
