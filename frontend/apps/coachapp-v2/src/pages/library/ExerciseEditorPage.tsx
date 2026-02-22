import {
  Autocomplete,
  Button,
  Card,
  Input,
  Label,
  ListBox,
  SearchField,
  Skeleton,
  TextField,
  toast,
  useFilter,
} from '@heroui/react';
import {ArrowLeft, Plus, Save, Trash2} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router';

import {getApiErrorMessage} from '@/api/shared';
import {useListExercisesQuery} from '@/api/exercises';
import {
  useCreateWorkoutElementMutation,
  useDeleteWorkoutElementMutation,
  useGetPlannedWorkoutQuery,
  useGetWorkoutElementQuery,
  useUpdateWorkoutElementMutation,
} from '@/api/trainingPlans';
import ConfirmDialog from '@/components/ConfirmDialog';
import {SetList} from '@/components/training-plan/SetList';
import {fromSetDraft, newSetDraft, type SetDraft, toSetDraft} from '@/components/training-plan/setDraftHelpers';

export default function ExerciseEditorPage() {
  const navigate = useNavigate();
  const {contains} = useFilter({sensitivity: 'base'});
  const {id: planId = '', workoutId = '', elementId} = useParams();
  const isEditMode = Boolean(elementId);
  const backTo = `/library/training-plans/${planId}/builder/workouts/${workoutId}`;

  const {data: workoutData, isLoading: isWorkoutLoading} = useGetPlannedWorkoutQuery(workoutId, {skip: !workoutId});
  const {data: elementData, isLoading: isElementLoading} = useGetWorkoutElementQuery(elementId ?? '', {
    skip: !elementId,
  });
  const {data: exercisesData, isLoading: isExercisesLoading} = useListExercisesQuery({limit: 250, offset: 0});

  const [createWorkoutElement, {isLoading: isCreating}] = useCreateWorkoutElementMutation();
  const [updateWorkoutElement, {isLoading: isUpdating}] = useUpdateWorkoutElementMutation();
  const [deleteWorkoutElement, {isLoading: isDeleting}] = useDeleteWorkoutElementMutation();

  const workout = workoutData?.data;
  const element = elementData?.data;
  const exercises = exercisesData?.data ?? [];
  const isLoading = isWorkoutLoading || isExercisesLoading || (isEditMode && isElementLoading);

  const [initialized, setInitialized] = useState(!isEditMode);
  const [exerciseId, setExerciseId] = useState('');
  const [notes, setNotes] = useState('');
  const [sets, setSets] = useState<SetDraft[]>(() => [newSetDraft()]);
  const [expandedSetIndex, setExpandedSetIndex] = useState<null | number>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    if (initialized || !element) return;
    setExerciseId(element.exercise_id);
    setNotes(element.notes ?? '');
    setSets(element.planned_sets.length > 0 ? element.planned_sets.map(toSetDraft) : [newSetDraft()]);
    setInitialized(true);
  }, [initialized, element]);

  const nextPosition = useMemo(() => (workout?.workout_elements.length ?? 0) + 1, [workout?.workout_elements.length]);

  const isMutating = isCreating || isUpdating || isDeleting;

  const handleSave = useCallback(async () => {
    if (!exerciseId) {
      toast.danger('Choose an exercise');
      return;
    }
    try {
      const plannedSets = sets.map(fromSetDraft);
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
      navigate(backTo);
    } catch (error) {
      toast.danger(getApiErrorMessage(error, isEditMode ? 'Failed to update exercise' : 'Failed to add exercise'));
    }
  }, [exerciseId, sets, isEditMode, elementId, notes, planId, workoutId, nextPosition, updateWorkoutElement, createWorkoutElement, navigate, backTo]);

  const handleDelete = useCallback(async () => {
    if (!elementId) return;
    setIsDeleteOpen(false);
    try {
      await deleteWorkoutElement({id: elementId, planId, plannedWorkoutId: workoutId}).unwrap();
      toast.success('Exercise deleted');
      navigate(backTo);
    } catch (error) {
      toast.danger(getApiErrorMessage(error, 'Failed to delete exercise'));
    }
  }, [elementId, deleteWorkoutElement, planId, workoutId, navigate, backTo]);

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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Button
        className="min-h-9 w-fit gap-2 px-2 text-muted hover:text-foreground"
        onPress={() => navigate(backTo)}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to workout
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {isEditMode ? 'Edit exercise' : 'Add exercise'}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {workout.name} · Day {workout.day_number}
        </p>
      </div>

      <div className="border-t border-separator" />

      <Autocomplete
        allowsEmptyCollection
        fullWidth
        onSelectionChange={(key) => setExerciseId(key?.toString() ?? '')}
        selectedKey={exerciseId || null}
        variant="secondary"
      >
        <Label className="text-sm font-medium text-foreground">Exercise</Label>
        <Autocomplete.Trigger className="min-h-11">
          <Autocomplete.Value />
          <Autocomplete.ClearButton />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search exercise..." />
              </SearchField.Group>
            </SearchField>
            <ListBox>
              {exercises.map((exercise) => (
                <ListBox.Item
                  id={exercise.id}
                  key={exercise.id}
                  textValue={exercise.name}
                >
                  <span className="text-sm">{exercise.name}</span>
                </ListBox.Item>
              ))}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>

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

      <div className="border-t border-separator" />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Sets</p>
          <p className="text-xs text-muted">
            {sets.length} set{sets.length === 1 ? '' : 's'} configured
          </p>
        </div>
        <Button
          className="min-h-9"
          onPress={() => {
            setSets((prev) => [...prev, newSetDraft()]);
            setExpandedSetIndex(sets.length);
          }}
          size="sm"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          Add set
        </Button>
      </div>

      <SetList
        expandedIndex={expandedSetIndex}
        onExpandedChange={setExpandedSetIndex}
        onRemove={(index) => {
          const next = sets.filter((_, i) => i !== index);
          setSets(next.length > 0 ? next : [newSetDraft()]);
          if (expandedSetIndex === index) setExpandedSetIndex(null);
          else if (expandedSetIndex !== null && expandedSetIndex > index) setExpandedSetIndex(expandedSetIndex - 1);
        }}
        onUpdate={(index, next) => {
          const nextSets = [...sets];
          nextSets[index] = next;
          setSets(nextSets);
        }}
        sets={sets}
      />

      <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-separator bg-background pb-4 pt-4">
        {isEditMode ? (
          <Button
            className="min-h-11 text-muted"
            isDisabled={isMutating}
            onPress={() => setIsDeleteOpen(true)}
            size="md"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <Button
            className="min-h-11"
            isDisabled={isMutating}
            onPress={() => navigate(backTo)}
            size="md"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            className="min-h-11"
            isDisabled={isMutating || !exerciseId}
            onPress={handleSave}
            size="md"
            variant="primary"
          >
            <Save className="h-4 w-4" />
            {isEditMode ? 'Save changes' : 'Save exercise'}
          </Button>
        </div>
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
