import {Button, Card, Input, Label, Skeleton, TextField, toast} from '@heroui/react';
import {ArrowLeft, Save, Trash2} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router';

import {getApiErrorMessage} from '@/api/shared';
import {
  useCreateWorkoutElementMutation,
  useDeleteWorkoutElementMutation,
  useGetPlannedWorkoutQuery,
  useGetWorkoutElementQuery,
  useUpdateWorkoutElementMutation,
} from '@/api/trainingPlans';
import ConfirmDialog from '@/components/ConfirmDialog';
import {SetConfigSection} from '@/components/training-plan/SetConfigSection';
import {
  areSetsUniform,
  fromSetDraft,
  newSetDraft,
  type SetDraft,
  toSetDraft,
} from '@/components/training-plan/setDraftHelpers';

export default function ExerciseEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id: planId = '', workoutId = '', elementId, exerciseId: newExerciseId} = useParams();
  const isEditMode = Boolean(elementId);
  const workoutDetailUrl = `/library/training-plans/${planId}/builder/workouts/${workoutId}`;
  const backTo = isEditMode ? workoutDetailUrl : `${workoutDetailUrl}/exercises/new`;

  const {data: workoutData, isLoading: isWorkoutLoading} = useGetPlannedWorkoutQuery(workoutId, {skip: !workoutId});
  const {data: elementData, isLoading: isElementLoading} = useGetWorkoutElementQuery(elementId ?? '', {
    skip: !elementId,
  });

  const [createWorkoutElement, {isLoading: isCreating}] = useCreateWorkoutElementMutation();
  const [updateWorkoutElement, {isLoading: isUpdating}] = useUpdateWorkoutElementMutation();
  const [deleteWorkoutElement, {isLoading: isDeleting}] = useDeleteWorkoutElementMutation();

  const workout = workoutData?.data;
  const element = elementData?.data;
  const isLoading = isWorkoutLoading || (isEditMode && isElementLoading);

  const exerciseId = isEditMode ? (element?.exercise_id ?? '') : (newExerciseId ?? '');
  const locationState = location.state as null | {exerciseName?: string};
  const exerciseName = isEditMode ? (element?.exercise?.name ?? '') : (locationState?.exerciseName ?? '');

  const [initialized, setInitialized] = useState(!isEditMode);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [sets, setSets] = useState<SetDraft[]>(() => [newSetDraft()]);
  const [isUniform, setIsUniform] = useState(true);
  const [setCount, setSetCount] = useState(3);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    if (initialized || !element) return;
    const initialNotes = element.notes ?? '';
    setNotes(initialNotes);
    if (initialNotes) setShowNotes(true);
    const loadedSets = element.planned_sets.length > 0 ? element.planned_sets.map(toSetDraft) : [newSetDraft()];
    const uniform = areSetsUniform(loadedSets);
    setIsUniform(uniform);
    setSetCount(loadedSets.length);
    setSets(uniform ? [loadedSets[0]!] : loadedSets);
    setInitialized(true);
  }, [initialized, element]);

  const nextPosition = useMemo(() => (workout?.workout_elements.length ?? 0) + 1, [workout?.workout_elements.length]);

  const isMutating = isCreating || isUpdating || isDeleting;

  const handleSave = useCallback(async () => {
    if (!exerciseId) {
      toast.danger('No exercise selected');
      return;
    }
    try {
      const plannedSets = isUniform
        ? Array.from({length: setCount}, () => fromSetDraft(sets[0]!))
        : sets.map(fromSetDraft);
      if (isEditMode && elementId) {
        await updateWorkoutElement({
          body: {exercise_id: exerciseId, notes: notes.trim() || undefined, planned_sets: plannedSets},
          id: elementId,
          planId,
          plannedWorkoutId: workoutId,
        }).unwrap();
        toast.success('Exercise updated');
      } else {
        await createWorkoutElement({
          body: {
            exercise_id: exerciseId,
            notes: notes.trim() || undefined,
            planned_sets: plannedSets,
            planned_workout_id: workoutId,
            position: nextPosition,
          },
          planId,
          plannedWorkoutId: workoutId,
        }).unwrap();
        toast.success('Exercise added');
      }
      navigate(workoutDetailUrl);
    } catch (error) {
      toast.danger(getApiErrorMessage(error, isEditMode ? 'Failed to update exercise' : 'Failed to add exercise'));
    }
  }, [
    exerciseId,
    sets,
    isUniform,
    setCount,
    isEditMode,
    elementId,
    notes,
    planId,
    workoutId,
    nextPosition,
    updateWorkoutElement,
    createWorkoutElement,
    navigate,
    workoutDetailUrl,
  ]);

  const handleDelete = useCallback(async () => {
    if (!elementId) return;
    setIsDeleteOpen(false);
    try {
      await deleteWorkoutElement({id: elementId, planId, plannedWorkoutId: workoutId}).unwrap();
      toast.success('Exercise deleted');
      navigate(workoutDetailUrl);
    } catch (error) {
      toast.danger(getApiErrorMessage(error, 'Failed to delete exercise'));
    }
  }, [elementId, deleteWorkoutElement, planId, workoutId, navigate, workoutDetailUrl]);

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
      <Card className="rounded-xl border border-separator bg-surface p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-foreground">Workout not found</p>
          <p className="text-sm text-muted">This workout may have been removed.</p>
          <Button
            className="min-h-11"
            onPress={() => navigate(`/library/training-plans/${planId}/builder`)}
            variant="secondary"
          >
            Back to plan
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <Button
        className="min-h-9 w-fit gap-2 px-2 text-muted hover:text-foreground"
        onPress={() => navigate(backTo)}
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
        uniform={{count: setCount, isUniform, onCountChange: setSetCount, onModeChange: setIsUniform}}
      />

      {showNotes ? (
        <TextField>
          <Label className="text-sm font-medium text-foreground">Notes (optional)</Label>
          <Input
            className="min-h-11"
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Exercise notes..."
            value={notes}
            variant="secondary"
          />
        </TextField>
      ) : (
        <button
          className="w-fit cursor-pointer border-none bg-transparent p-0 text-sm font-medium text-muted hover:text-foreground"
          onClick={() => setShowNotes(true)}
          type="button"
        >
          + Add notes
        </button>
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
          onPress={() => navigate(backTo)}
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
