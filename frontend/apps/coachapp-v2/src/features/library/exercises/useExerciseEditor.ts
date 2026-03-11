import {toast} from '@heroui/react';
import {useCallback, useEffect, useMemo, useState} from 'react';

import {
  useCreateWorkoutElementMutation,
  useDeleteWorkoutElementMutation,
  useGetPlannedWorkoutQuery,
  useGetWorkoutElementQuery,
  useUpdateWorkoutElementMutation,
} from '@/entities/trainingPlans/api/trainingPlans';
import {
  areSetsUniform,
  fromSetDraft,
  newSetDraft,
  type SetDraft,
  toSetDraft,
} from '@/features/library/shared/workout-sets/setDraftHelpers';
import {getApiErrorMessage} from '@/shared/api/shared';

type UseExerciseEditorParams = {
  elementId?: string;
  exerciseName: string;
  newExerciseId?: string;
  onSaved: () => void;
  planId: string;
  workoutId: string;
};

export default function useExerciseEditor({
  elementId,
  exerciseName,
  newExerciseId,
  onSaved,
  planId,
  workoutId,
}: UseExerciseEditorParams) {
  const isEditMode = Boolean(elementId);

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
      onSaved();
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
    onSaved,
  ]);

  const handleDelete = useCallback(async () => {
    if (!elementId) return;
    setIsDeleteOpen(false);
    try {
      await deleteWorkoutElement({id: elementId, planId, plannedWorkoutId: workoutId}).unwrap();
      toast.success('Exercise deleted');
      onSaved();
    } catch (error) {
      toast.danger(getApiErrorMessage(error, 'Failed to delete exercise'));
    }
  }, [elementId, deleteWorkoutElement, planId, workoutId, onSaved]);

  return {
    exerciseId,
    exerciseName,
    handleDelete,
    handleSave,
    isDeleteOpen,
    isDeleting,
    isEditMode,
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
  };
}
