import {Button, Card, Skeleton, toast} from '@heroui/react';
import {ArrowLeft, Dumbbell, Pencil, Plus, Trash2} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router';

import {getApiErrorMessage} from '@/api/shared';
import {useListExercisesQuery} from '@/api/exercises';
import {
  useDeletePlannedWorkoutMutation,
  useDeleteWorkoutElementMutation,
  useGetPlannedWorkoutQuery,
  useUpdatePlannedWorkoutMutation,
} from '@/api/trainingPlans';
import ConfirmDialog from '@/components/ConfirmDialog';
import {RenameWorkoutModal} from '@/components/training-plan/RenameWorkoutModal';
import {WorkoutExerciseCard} from '@/components/training-plan/WorkoutExerciseCard';

export default function WorkoutDetailPage() {
  const navigate = useNavigate();
  const {id: planId = '', workoutId = ''} = useParams();
  const backTo = `/library/training-plans/${planId}/builder`;

  const {data: workoutData, isLoading} = useGetPlannedWorkoutQuery(workoutId, {skip: !workoutId});
  const {data: exercisesData} = useListExercisesQuery({
    limit: 250,
    offset: 0,
  });

  const [updatePlannedWorkout, {isLoading: isRenaming}] = useUpdatePlannedWorkoutMutation();
  const [deletePlannedWorkout, {isLoading: isDeletingWorkout}] = useDeletePlannedWorkoutMutation();
  const [deleteWorkoutElement, {isLoading: isDeletingElement}] = useDeleteWorkoutElementMutation();

  const workout = workoutData?.data;
  const exercisesList = exercisesData?.data;

  const sortedElements = useMemo(
    () => [...(workout?.workout_elements ?? [])].sort((a, b) => a.position - b.position),
    [workout?.workout_elements],
  );

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteWorkoutOpen, setIsDeleteWorkoutOpen] = useState(false);
  const [elementToDelete, setElementToDelete] = useState<null | string>(null);

  const exerciseNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (exercisesList ?? []).forEach((e) => map.set(e.id, e.name));
    return map;
  }, [exercisesList]);

  const getExerciseName = (exerciseId: string, fallbackName?: null | string) =>
    fallbackName ?? exerciseNameMap.get(exerciseId) ?? 'Exercise';

  const handleRename = async (name: string) => {
    try {
      await updatePlannedWorkout({
        body: {name},
        id: workoutId,
        planId,
      }).unwrap();
      toast.success('Workout renamed');
      setIsRenameOpen(false);
    } catch (error) {
      toast.danger(getApiErrorMessage(error, 'Failed to rename workout'));
    }
  };

  const handleDeleteWorkout = async () => {
    setIsDeleteWorkoutOpen(false);
    try {
      await deletePlannedWorkout({id: workoutId, planId}).unwrap();
      toast.success('Workout deleted');
      navigate(backTo);
    } catch (error) {
      toast.danger(getApiErrorMessage(error, 'Failed to delete workout'));
    }
  };

  const handleDeleteElement = async () => {
    if (!elementToDelete) return;
    const id = elementToDelete;
    setElementToDelete(null);
    try {
      await deleteWorkoutElement({
        id,
        planId,
        plannedWorkoutId: workoutId,
      }).unwrap();
      toast.success('Exercise deleted');
    } catch (error) {
      toast.danger(getApiErrorMessage(error, 'Failed to delete exercise'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!workout) {
    return (
      <Card className="rounded-xl border border-separator bg-surface p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-foreground">Workout not found</p>
          <p className="text-sm text-muted">This workout may have been removed.</p>
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
      <Button
        className="min-h-9 w-fit gap-2 px-2 text-muted hover:text-foreground"
        onPress={() => navigate(backTo)}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to plan
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{workout.name}</h1>
          <p className="text-sm text-muted">
            Day {workout.day_number} · {sortedElements.length} exercise
            {sortedElements.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            className="min-h-11"
            onPress={() => setIsRenameOpen(true)}
            size="md"
            variant="outline"
          >
            <Pencil className="h-4 w-4" />
            Rename
          </Button>
          <Button
            className="min-h-11"
            isDisabled={isDeletingWorkout}
            onPress={() => setIsDeleteWorkoutOpen(true)}
            size="md"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="border-t border-separator" />

      <div className="flex items-center justify-between">
        <p className="text-base font-semibold text-foreground">Exercises</p>
        <Button
          className="min-h-11"
          onPress={() => navigate(`/library/training-plans/${planId}/builder/workouts/${workoutId}/exercises/new`)}
          size="sm"
          variant="secondary"
        >
          <Plus className="h-4 w-4" />
          Add exercise
        </Button>
      </div>

      {sortedElements.length === 0 ? (
        <Card className="border border-dashed border-separator bg-surface p-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-secondary">
              <Dumbbell className="h-8 w-8 text-muted" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">No exercises yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted">Add exercises to build this workout.</p>
            </div>
            <Button
              className="mt-2 min-h-11"
              onPress={() => navigate(`/library/training-plans/${planId}/builder/workouts/${workoutId}/exercises/new`)}
              size="md"
              variant="primary"
            >
              <Plus className="h-4 w-4" />
              Add first exercise
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedElements.map((el) => (
            <WorkoutExerciseCard
              element={el}
              exerciseName={getExerciseName(el.exercise_id, el.exercise?.name)}
              key={el.id}
              onTap={() =>
                navigate(`/library/training-plans/${planId}/builder/workouts/${workoutId}/exercises/${el.id}`)
              }
            />
          ))}
        </div>
      )}

      <RenameWorkoutModal
        currentName={workout.name}
        isLoading={isRenaming}
        isOpen={isRenameOpen}
        onOpenChange={setIsRenameOpen}
        onSave={handleRename}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Delete this workout and all its exercises? This cannot be undone."
        isLoading={isDeletingWorkout}
        isOpen={isDeleteWorkoutOpen}
        onConfirm={handleDeleteWorkout}
        onOpenChange={setIsDeleteWorkoutOpen}
        title="Delete workout"
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Delete this exercise? This cannot be undone."
        isLoading={isDeletingElement}
        isOpen={elementToDelete !== null}
        onConfirm={handleDeleteElement}
        onOpenChange={(open) => {
          if (!open) setElementToDelete(null);
        }}
        title="Delete exercise"
      />
    </div>
  );
}
