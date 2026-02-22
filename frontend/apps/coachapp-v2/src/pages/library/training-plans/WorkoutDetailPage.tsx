import {Button, Card, Dropdown, Label, Skeleton, toast} from '@heroui/react';
import {ArrowLeft, Dumbbell, EllipsisVertical, Pencil, Plus, Trash2} from 'lucide-react';
import {Fragment, useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router';

import type {WorkoutElement} from '@/api/trainingPlans';

import {useListExercisesQuery} from '@/api/exercises';
import {getApiErrorMessage} from '@/api/shared';
import {
  useDeletePlannedWorkoutMutation,
  useGetPlannedWorkoutQuery,
  useUpdatePlannedWorkoutMutation,
  useUpdateWorkoutElementMutation,
} from '@/api/trainingPlans';
import ConfirmDialog from '@/components/ConfirmDialog';
import {RenameWorkoutModal} from '@/pages/library/training-plans/RenameWorkoutModal';
import {WorkoutExerciseCard} from '@/pages/library/training-plans/WorkoutExerciseCard';

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
  const [updateWorkoutElement] = useUpdateWorkoutElementMutation();

  const workout = workoutData?.data;
  const exercisesList = exercisesData?.data;

  const sortedElements = useMemo(
    () => [...(workout?.workout_elements ?? [])].sort((a, b) => a.position - b.position),
    [workout?.workout_elements],
  );

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteWorkoutOpen, setIsDeleteWorkoutOpen] = useState(false);

  const exerciseNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (exercisesList ?? []).forEach((e) => map.set(e.id, e.name));
    return map;
  }, [exercisesList]);

  const getExerciseName = (exerciseId: string, fallbackName?: null | string) =>
    fallbackName ?? exerciseNameMap.get(exerciseId) ?? 'Exercise';

  const handleAction = (key: React.Key) => {
    switch (key) {
      case 'rename':
        setIsRenameOpen(true);
        break;
      case 'delete':
        setIsDeleteWorkoutOpen(true);
        break;
    }
  };

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

  const handleMoveExercise = async (element: WorkoutElement, direction: 'down' | 'up') => {
    const currentIndex = sortedElements.findIndex((el) => el.id === element.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetElement = sortedElements[targetIndex];
    if (!targetElement) return;

    try {
      await Promise.all([
        updateWorkoutElement({
          body: {position: targetElement.position},
          id: element.id,
          planId,
          plannedWorkoutId: workoutId,
        }).unwrap(),
        updateWorkoutElement({
          body: {position: element.position},
          id: targetElement.id,
          planId,
          plannedWorkoutId: workoutId,
        }).unwrap(),
      ]);
    } catch (error) {
      toast.danger(getApiErrorMessage(error, 'Failed to reorder exercises'));
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
              aria-label="Workout actions"
              onAction={handleAction}
            >
              <Dropdown.Item
                id="rename"
                textValue="Rename"
              >
                <Pencil className="h-4 w-4" />
                <Label>Rename</Label>
              </Dropdown.Item>
              <Dropdown.Item
                className="text-danger"
                id="delete"
                textValue="Delete workout"
              >
                <Trash2 className="h-4 w-4" />
                <Label>Delete workout</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      {/* Title area */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{workout.name}</h1>
        <p className="mt-1 text-sm text-muted">
          Day {workout.day_number} · {sortedElements.length} exercise{sortedElements.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="border-t border-separator" />

      {/* Exercise list */}
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
        <Card className="overflow-hidden rounded-xl border border-separator bg-surface p-0">
          {sortedElements.map((el, i) => (
            <Fragment key={el.id}>
              {i > 0 && <div className="border-t border-separator" />}
              <WorkoutExerciseCard
                canMove={{down: i < sortedElements.length - 1, up: i > 0}}
                element={el}
                exerciseName={getExerciseName(el.exercise_id, el.exercise?.name)}
                onMove={(dir) => handleMoveExercise(el, dir)}
                onTap={() =>
                  navigate(`/library/training-plans/${planId}/builder/workouts/${workoutId}/exercises/${el.id}`)
                }
              />
            </Fragment>
          ))}
        </Card>
      )}

      <Button
        className="min-h-11 w-full"
        onPress={() => navigate(`/library/training-plans/${planId}/builder/workouts/${workoutId}/exercises/new`)}
        variant="secondary"
      >
        <Plus className="h-4 w-4" />
        Add exercise
      </Button>

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
    </div>
  );
}
