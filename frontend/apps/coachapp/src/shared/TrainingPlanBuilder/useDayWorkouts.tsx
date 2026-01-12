import {humanizeError} from '@easy/error-parser';
import {useMemo, useState} from 'react';

import {CreatePlannedWorkout, useCreatePlannedWorkout, useDeletePlannedWorkout} from '@/services/planned_workouts';
import {type DayOfWeek, PlannedWorkout, WorkoutElement} from '@/services/training_plans';
import {
  CreateWorkoutElement,
  PlannedSet,
  useCreateWorkoutElement,
  useDeleteWorkoutElement,
  useUpdateWorkoutElement,
} from '@/services/workout_elements';
import {notifyError} from '@/utils/notification';

export type UseDayWorkoutsArgs = {
  currentDay: DayOfWeek;
  planId: null | string;
  workouts: PlannedWorkout[];
};

const useDayWorkouts = ({currentDay, planId, workouts}: UseDayWorkoutsArgs) => {
  const [localLoading, setLocalLoading] = useState<boolean>(false);
  const [isExerciseDrawerOpen, setIsExerciseDrawerOpen] = useState(false);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<null | string>(null);
  const [selectedElement, setSelectedElement] = useState<null | WorkoutElement>(null);
  const [isAddWorkoutModalOpen, setIsAddWorkoutModalOpen] = useState(false);

  // Mutations
  const [createWorkoutElementMutation] = useCreateWorkoutElement();
  const [updateWorkoutElementMutation] = useUpdateWorkoutElement();
  const [deleteWorkoutElementMutation] = useDeleteWorkoutElement();
  const [createPlannedWorkoutMutation] = useCreatePlannedWorkout();
  const [deletePlannedWorkoutMutation] = useDeletePlannedWorkout();

  // Get workouts for the current day
  const workoutsForDay = useMemo(() => {
    if (!workouts) return [];
    return workouts.filter((workout) => workout.day_number === currentDay);
  }, [workouts, currentDay]);

  // Get all days that have workouts (for visual indicator)
  const workoutDays = useMemo(() => {
    if (!workouts) return [];
    const days = new Set<DayOfWeek>();
    workouts.forEach((workout) => {
      days.add(workout.day_number);
    });
    return Array.from(days);
  }, [workouts]);

  // Build a map of exercise_id -> exercise name from the workout elements
  const exerciseNames: Record<string, string> = useMemo(() => {
    const names: Record<string, string> = {};
    workouts?.forEach((workout) => {
      workout.elements?.forEach((element) => {
        if (element.exercise?.id && element.exercise?.name) {
          names[element.exercise.id] = element.exercise.name;
        }
      });
    });
    return names;
  }, [workouts]);

  const openExerciseDrawer = (workoutId: string) => {
    setSelectedWorkoutId(workoutId);
    setIsExerciseDrawerOpen(true);
  };

  const closeExerciseDrawer = () => {
    setIsExerciseDrawerOpen(false);
    setSelectedWorkoutId(null);
  };

  const handleAddExercise = async (workoutId: string) => {
    if (!planId) return;
    openExerciseDrawer(workoutId);
  };

  const handleExerciseSelect = async (selectedIds: string[]) => {
    const firstSelectedId = selectedIds[0];
    if (!planId || !selectedWorkoutId || !firstSelectedId) return;

    setLocalLoading(true);

    try {
      // Find the workout to get the next position
      const workout = workoutsForDay.find((w) => w.id === selectedWorkoutId);
      const nextPosition = (workout?.elements?.length ?? 0) + 1;

      const elementData: CreateWorkoutElement = {
        planned_workout_id: selectedWorkoutId,
        exercise_id: firstSelectedId,
        position: nextPosition,
        sets: [
          {
            target_reps: '8-12',
            load_value: null,
            load_unit: 'none',
            intensity_target: null,
            rest_seconds: 60,
            set_type: 'working',
            notes: null,
            duration_seconds: null,
            distance_value: null,
            distance_unit: 'none',
            tempo: null,
          },
          {
            target_reps: '8-12',
            load_value: null,
            load_unit: 'none',
            intensity_target: null,
            rest_seconds: 60,
            set_type: 'working',
            notes: null,
            duration_seconds: null,
            distance_value: null,
            distance_unit: 'none',
            tempo: null,
          },
          {
            target_reps: '8-12',
            load_value: null,
            load_unit: 'none',
            intensity_target: null,
            rest_seconds: 60,
            set_type: 'working',
            notes: null,
            duration_seconds: null,
            distance_value: null,
            distance_unit: 'none',
            tempo: null,
          },
        ],
      };

      await createWorkoutElementMutation(elementData).unwrap();
      closeExerciseDrawer();
    } catch (e) {
      const errMsg = humanizeError(e);
      notifyError(errMsg);
    } finally {
      setLocalLoading(false);
    }
  };

  const deleteExercise = async (_workoutId: string, elementId: string) => {
    if (!planId) return;

    setLocalLoading(true);

    try {
      await deleteWorkoutElementMutation(elementId).unwrap();
    } catch (e) {
      const errMsg = humanizeError(e);
      notifyError(errMsg);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleExerciseClick = (workoutId: string, element: WorkoutElement) => {
    setSelectedWorkoutId(workoutId);
    setSelectedElement(element);
  };

  const closeElementEditor = () => {
    setSelectedElement(null);
    setSelectedWorkoutId(null);
  };

  const updateElementSets = async (elementId: string, sets: PlannedSet[]) => {
    setLocalLoading(true);

    try {
      await updateWorkoutElementMutation({
        id: elementId,
        sets,
      }).unwrap();
      closeElementEditor();
    } catch (e) {
      const errMsg = humanizeError(e);
      notifyError(errMsg);
    } finally {
      setLocalLoading(false);
    }
  };

  // Workout management
  const openAddWorkoutModal = () => {
    setIsAddWorkoutModalOpen(true);
  };

  const closeAddWorkoutModal = () => {
    setIsAddWorkoutModalOpen(false);
  };

  const createWorkout = async (data: Omit<CreatePlannedWorkout, 'day_number' | 'training_plan_id'>) => {
    if (!planId) {
      notifyError('No training plan selected');
      return;
    }

    setLocalLoading(true);

    try {
      await createPlannedWorkoutMutation({
        ...data,
        training_plan_id: planId,
        day_number: currentDay,
      }).unwrap();
      closeAddWorkoutModal();
    } catch (e) {
      const errMsg = humanizeError(e);
      notifyError(errMsg);
    } finally {
      setLocalLoading(false);
    }
  };

  const deleteWorkout = async (workoutId: string) => {
    setLocalLoading(true);

    try {
      await deletePlannedWorkoutMutation(workoutId).unwrap();
    } catch (e) {
      const errMsg = humanizeError(e);
      notifyError(errMsg);
    } finally {
      setLocalLoading(false);
    }
  };

  return {
    planId,
    isLoading: localLoading,
    currentDay,
    workoutsForDay,
    workoutDays,
    exerciseNames,
    isExerciseDrawerOpen,
    selectedWorkoutId,
    selectedElement,
    openExerciseDrawer,
    closeExerciseDrawer,
    handleExerciseSelect,
    handleAddExercise,
    deleteExercise,
    handleExerciseClick,
    closeElementEditor,
    updateElementSets,
    // Workout management
    isAddWorkoutModalOpen,
    openAddWorkoutModal,
    closeAddWorkoutModal,
    createWorkout,
    deleteWorkout,
  };
};

export default useDayWorkouts;
