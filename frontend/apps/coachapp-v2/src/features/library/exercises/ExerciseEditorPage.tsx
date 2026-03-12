import {Button, Input, Label, Skeleton, TextField} from '@heroui/react';
import {useLocation, useNavigate, useParams} from '@tanstack/react-router';
import {ArrowLeft, Save, Trash2} from 'lucide-react';

import useExerciseEditor from '@/features/library/exercises/useExerciseEditor';
import {SetConfigSection} from '@/features/library/shared/workout-sets/SetConfigSection';
import ConfirmDialog from '@/shared/ui/feedback/ConfirmDialog';
import NotFoundCard from '@/shared/ui/feedback/NotFoundCard';

export default function ExerciseEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id: planId = '', workoutId = '', elementId, exerciseId: newExerciseId} = useParams({strict: false});
  const isEditMode = Boolean(elementId);
  const workoutDetailUrl = `/library/training-plans/${planId}/builder/workouts/${workoutId}`;
  const backTo = isEditMode ? workoutDetailUrl : `${workoutDetailUrl}/exercises/new`;

  const locationState = location.state as Record<string, unknown>;
  const exerciseNameFromState = isEditMode ? '' : ((locationState?.exerciseName as string) ?? '');

  const {
    exerciseId,
    exerciseName,
    handleDelete,
    handleSave,
    isDeleteOpen,
    isDeleting,
    isLoading,
    isMutating,
    isUniform,
    notes,
    setCount,
    setIsDeleteOpen,
    setIsUniform,
    setNotes,
    setSetCount,
    setSets,
    setShowNotes,
    sets,
    showNotes,
    workout,
  } = useExerciseEditor({
    elementId,
    exerciseName: exerciseNameFromState,
    newExerciseId,
    onSaved: () => navigate({to: workoutDetailUrl}),
    planId,
    workoutId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!workout) {
    return (
      <NotFoundCard
        backLabel="Back to plan"
        description="This workout may have been removed."
        onBack={() => navigate({to: `/library/training-plans/${planId}/builder`})}
        title="Workout not found"
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <Button
        className="min-h-9 w-fit gap-2 px-2 text-muted hover:text-foreground"
        onPress={() => navigate({to: backTo})}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="h-4 w-4" />
        {isEditMode ? 'Workout' : 'Choose exercise'}
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {exerciseName || (isEditMode ? 'Edit exercise' : 'Add exercise')}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {workout.name} · Day {workout.day_number}
        </p>
      </div>

      <div className="border-t border-separator" />

      <SetConfigSection
        onSetsChange={setSets}
        sets={sets}
        uniform={{
          count: setCount,
          isUniform,
          onCountChange: setSetCount,
          onModeChange: setIsUniform,
        }}
      />

      {showNotes ? (
        <TextField>
          <Label className="text-sm font-medium text-foreground">Notes (optional)</Label>
          <Input
            className="min-h-11"
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Exercise notes…"
            value={notes}
            variant="secondary"
          />
        </TextField>
      ) : (
        <Button
          className="w-fit p-0 text-sm font-medium text-muted hover:text-foreground"
          onPress={() => setShowNotes(true)}
          variant="ghost"
        >
          + Add notes
        </Button>
      )}

      <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-separator bg-background pb-4 pt-4 sm:flex-row sm:items-center">
        {isEditMode ? (
          <Button
            className="min-h-11 w-full text-muted sm:mr-auto sm:w-auto"
            isDisabled={isMutating}
            onPress={() => setIsDeleteOpen(true)}
            size="md"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        ) : null}
        <Button
          className="min-h-11 w-full sm:w-auto"
          isDisabled={isMutating}
          onPress={() => navigate({to: backTo})}
          size="md"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          className="min-h-11 w-full sm:w-auto"
          isDisabled={isMutating || !exerciseId}
          onPress={handleSave}
          size="md"
          variant="primary"
        >
          <Save className="h-4 w-4" />
          {isEditMode ? 'Save changes' : 'Save exercise'}
        </Button>
      </div>

      {isEditMode ? (
        <ConfirmDialog
          confirmLabel="Delete"
          description="Delete this exercise? This cannot be undone."
          isLoading={isDeleting}
          isOpen={isDeleteOpen}
          onConfirm={handleDelete}
          onOpenChange={setIsDeleteOpen}
          title="Delete exercise"
        />
      ) : null}
    </div>
  );
}
