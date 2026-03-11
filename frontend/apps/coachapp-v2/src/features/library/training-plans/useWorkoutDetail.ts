import {toast} from '@heroui/react';
import {useMemo, useState} from 'react';

import type {WorkoutElement} from '@/entities/trainingPlans/api/trainingPlans';

import {useListExercisesQuery} from '@/entities/exercises/api/exercises';
import {
  useDeletePlannedWorkoutMutation,
  useGetPlannedWorkoutQuery,
  useUpdatePlannedWorkoutMutation,
  useUpdateWorkoutElementMutation,
} from '@/entities/trainingPlans/api/trainingPlans';
import {getApiErrorMessage} from '@/shared/api/shared';

export default function useWorkoutDetail(planId: string, workoutId: string, onDeleted: () => void) {
  const {data: workoutData, isLoading} = useGetPlannedWorkoutQuery(workoutId, {skip: !workoutId});
  const {data: exercisesData} = useListExercisesQuery({limit: 250, offset: 0});

  const [updatePlannedWorkout, {isLoading: isRenaming}] = useUpdatePlannedWorkoutMutation();
  const [deletePlannedWorkout, {isLoading: isDeletingWorkout}] = useDeletePlannedWorkoutMutation();
  const [updateWorkoutElement] = useUpdateWorkoutElementMutation();

  const workout = workoutData?.data;

  const sortedElements = useMemo(
    () => (workout?.workout_elements ?? []).toSorted((a, b) => a.position - b.position),
    [workout?.workout_elements],
  );

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteWorkoutOpen, setIsDeleteWorkoutOpen] = useState(false);

  const exerciseNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (exercisesData?.data ?? []).forEach((e) => map.set(e.id, e.name));
    return map;
  }, [exercisesData?.data]);

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
      onDeleted();
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

  return {
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
  };
}
