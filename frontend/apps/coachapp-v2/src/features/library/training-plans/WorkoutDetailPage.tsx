import {Button, Card, Dropdown, Label, Skeleton} from '@heroui/react';
import {useNavigate, useParams} from '@tanstack/react-router';
import {ArrowLeft, Dumbbell, EllipsisVertical, Pencil, Plus, Trash2} from 'lucide-react';
import {Fragment} from 'react';

import {RenameWorkoutModal} from '@/features/library/training-plans/RenameWorkoutModal';
import useWorkoutDetail from '@/features/library/training-plans/useWorkoutDetail';
import {WorkoutExerciseCard} from '@/features/library/training-plans/WorkoutExerciseCard';
import ConfirmDialog from '@/shared/ui/feedback/ConfirmDialog';
import NotFoundCard from '@/shared/ui/feedback/NotFoundCard';

export default function WorkoutDetailPage() {
  const navigate = useNavigate();
  const {id: planId = '', workoutId = ''} = useParams({strict: false});
  const backTo = `/library/training-plans/${planId}/builder`;

  const {
    getExerciseName,
    handleDeleteWorkout,
    handleMoveExercise,
    handleRename,
    isDeleteWorkoutOpen,
    isDeletingWorkout,
    isLoading,
    isRenameOpen,
    isRenaming,
    setIsDeleteWorkoutOpen,
    setIsRenameOpen,
    sortedElements,
    workout,
  } = useWorkoutDetail(planId, workoutId, () => navigate({to: backTo}));

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
      <NotFoundCard
        backLabel="Back to plan"
        description="This workout may have been removed."
        onBack={() => navigate({to: backTo})}
        title="Workout not found"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button
          className="min-h-11 w-fit gap-1.5 px-2 text-muted hover:text-foreground"
          onPress={() => navigate({to: backTo})}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
          Plan
        </Button>
        <Dropdown>
          <Dropdown.Trigger>
            <Button
              aria-label="More actions"
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

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{workout.name}</h1>
        <p className="mt-1 text-sm text-muted">
          Day {workout.day_number} · {sortedElements.length} exercise
          {sortedElements.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="border-t border-separator" />

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
              onPress={() =>
                navigate({to: `/library/training-plans/${planId}/builder/workouts/${workoutId}/exercises/new`})
              }
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
                  navigate({to: `/library/training-plans/${planId}/builder/workouts/${workoutId}/exercises/${el.id}`})
                }
              />
            </Fragment>
          ))}
        </Card>
      )}

      <Button
        className="min-h-11 w-full"
        onPress={() => navigate({to: `/library/training-plans/${planId}/builder/workouts/${workoutId}/exercises/new`})}
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
