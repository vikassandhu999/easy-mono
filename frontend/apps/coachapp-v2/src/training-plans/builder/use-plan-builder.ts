/**
 * Every write the training builder can perform, in one place.
 *
 * Components below this call these functions and render what they are given;
 * none of them import `coachApi`, dispatch, or know a cache key exists. The
 * optimistic protocol — patch, request, undo on failure, toast — is written
 * once in `commit` rather than at each of the ten call sites that used to
 * repeat it.
 *
 * Set writes are the exception and go through `useSetWriter`, because the whole
 * array is replaced on every edit and that needs serialising. See that file.
 */
import {toast} from '@heroui/react';
import {useCallback} from 'react';
import {useSearchParams} from 'react-router-dom';

import {toastMutationError} from '@/@components/mutation-toast';
import type {TrainingExercise, TrainingPlan, TrainingPlanWorkout} from '@/api/generated';
import {
  useCreateWorkoutElementMutation,
  useCreateWorkoutMutation,
  useDeleteWorkoutElementMutation,
  useDeleteWorkoutMutation,
  useReorderWorkoutElementsMutation,
  useSetTrainingPlanDayScheduleMutation,
  useUpdateTrainingPlanMutation,
  useUpdateWorkoutMutation,
} from '@/api/generated';
import {usePlanPatcher} from '@/api/training-plan-builder';

import {findWorkout, moveId} from './plan-tree';
import {clearWorkoutFromSchedule, type Day, setScheduleDay} from './schedule';
import {appendSet, blankSet, type PlannedSet, patchSet, removeSet} from './sets';
import {SET_EDIT_DEBOUNCE_MS, useSetWriter} from './use-set-writer';

export function usePlanBuilder(plan: TrainingPlan) {
  const planId = plan.id;
  const patch = usePlanPatcher(planId);
  const writeSets = useSetWriter(planId);

  const [createWorkout, {isLoading: isAddingWorkout}] = useCreateWorkoutMutation();
  const [updateWorkout] = useUpdateWorkoutMutation();
  const [deleteWorkout, {isLoading: isRemovingWorkout}] = useDeleteWorkoutMutation();
  const [setDaySchedule] = useSetTrainingPlanDayScheduleMutation();
  const [createElement] = useCreateWorkoutElementMutation();
  const [deleteElement] = useDeleteWorkoutElementMutation();
  const [reorderElements] = useReorderWorkoutElementsMutation();
  const [updatePlan] = useUpdateTrainingPlanMutation();

  /** Show the change at once; put it back and say so if the server refuses. */
  const commit = useCallback(
    async (recipe: (draft: TrainingPlan) => void, run: () => Promise<unknown>, failMessage: string) => {
      const patched = patch(recipe);
      try {
        await run();
      } catch (error) {
        patched.undo();
        toastMutationError(error, failMessage);
      }
    },
    [patch],
  );

  // -------------------------------------------------------------------------
  // Workouts
  // -------------------------------------------------------------------------

  /** Resolves to the created workout so the caller can select and rename it. */
  const addWorkout = useCallback(async (): Promise<TrainingPlanWorkout | undefined> => {
    try {
      const {data: workout} = await createWorkout({
        planId,
        trainingWorkoutRequest: {name: 'New workout'},
      }).unwrap();
      patch((draft) => {
        draft.workouts.push(workout);
      });
      return workout;
    } catch (error) {
      toastMutationError(error, "Couldn't add workout");
      return undefined;
    }
  }, [createWorkout, patch, planId]);

  const renameWorkout = useCallback(
    (workoutId: string, name: string) =>
      commit(
        (draft) => {
          const workout = findWorkout(draft, workoutId);
          if (workout) {
            workout.name = name;
          }
        },
        () => updateWorkout({id: workoutId, trainingWorkoutUpdateRequest: {name}}).unwrap(),
        "Couldn't save changes",
      ),
    [commit, updateWorkout],
  );

  const removeWorkout = useCallback(
    (workoutId: string) =>
      commit(
        (draft) => {
          draft.workouts = draft.workouts.filter((workout) => workout.id !== workoutId);
          // The backend cascades the schedule entries; mirror it, or the weekday
          // chips keep pointing at a workout that no longer exists.
          draft.plan_items = clearWorkoutFromSchedule(draft.plan_items, workoutId);
        },
        () => deleteWorkout({id: workoutId}).unwrap(),
        "Couldn't delete workout",
      ),
    [commit, deleteWorkout],
  );

  // -------------------------------------------------------------------------
  // Schedule
  // -------------------------------------------------------------------------

  /**
   * A weekday holds at most one workout, so assigning a day implicitly takes it
   * off whichever workout held it. That rule is the server's, and both sides of
   * `setScheduleDay` encode it.
   */
  const scheduleDay = useCallback(
    (day: Day, workoutId: string | null) =>
      commit(
        (draft) => {
          draft.plan_items = setScheduleDay(draft.plan_items, day, workoutId, planId);
        },
        () =>
          setDaySchedule({
            planId,
            day,
            trainingDayScheduleRequest: {training_workout_id: workoutId},
          }).unwrap(),
        "Couldn't save changes",
      ),
    [commit, planId, setDaySchedule],
  );

  // -------------------------------------------------------------------------
  // Exercises
  // -------------------------------------------------------------------------

  const addExercises = useCallback(
    async (workoutId: string, exercises: TrainingExercise[]) => {
      for (const exercise of exercises) {
        try {
          const {data: element} = await createElement({
            workoutId,
            trainingWorkoutExerciseRequest: {exercise_id: exercise.id, planned_sets: [blankSet()]},
          }).unwrap();
          patch((draft) => {
            findWorkout(draft, workoutId)?.workout_elements.push(element);
          });
        } catch (error) {
          toastMutationError(error, "Couldn't add exercise");
        }
      }
    },
    [createElement, patch],
  );

  const removeExercise = useCallback(
    (workoutId: string, elementId: string) =>
      commit(
        (draft) => {
          const workout = findWorkout(draft, workoutId);
          if (workout) {
            workout.workout_elements = workout.workout_elements.filter((element) => element.id !== elementId);
          }
        },
        () => deleteElement({id: elementId}).unwrap(),
        "Couldn't remove exercise",
      ),
    [commit, deleteElement],
  );

  const moveExercise = useCallback(
    (workoutId: string, from: number, to: number) => {
      const workout = findWorkout(plan, workoutId);
      if (!workout) {
        return Promise.resolve();
      }
      const order = moveId(
        workout.workout_elements.map((element) => element.id),
        from,
        to,
      );
      return commit(
        (draft) => {
          const target = findWorkout(draft, workoutId);
          if (!target) {
            return;
          }
          const byId = new Map(target.workout_elements.map((element) => [element.id, element]));
          target.workout_elements = order.flatMap((id, position) => {
            const element = byId.get(id);
            return element ? [{...element, position}] : [];
          });
        },
        () => reorderElements({workoutId, trainingWorkoutReorderRequest: {element_ids: order}}).unwrap(),
        "Couldn't reorder exercises",
      );
    },
    [commit, plan, reorderElements],
  );

  // -------------------------------------------------------------------------
  // Sets — serialised, see use-set-writer.ts
  // -------------------------------------------------------------------------

  const editSet = useCallback(
    (elementId: string, index: number, values: Partial<PlannedSet>) =>
      writeSets(elementId, (sets) => patchSet(sets, index, values), SET_EDIT_DEBOUNCE_MS),
    [writeSets],
  );

  const addSet = useCallback((elementId: string) => writeSets(elementId, appendSet), [writeSets]);

  const dropSet = useCallback(
    (elementId: string, index: number) => writeSets(elementId, (sets) => removeSet(sets, index)),
    [writeSets],
  );

  // -------------------------------------------------------------------------
  // Assignment period
  // -------------------------------------------------------------------------

  const setPlanDate = useCallback(
    (field: 'start_date' | 'end_date', value: string | null) => {
      if ((plan[field] ?? null) === value) {
        return;
      }
      // An end before the start violates the backend's daterange constraint —
      // a hard Postgres error on assigned plans, so refuse it here with a
      // readable message rather than let it 500.
      const start = field === 'start_date' ? value : plan.start_date;
      const end = field === 'end_date' ? value : plan.end_date;
      if (start && end && end < start) {
        toast.danger('End date must be on or after the start date');
        return;
      }
      commit(
        (draft) => {
          draft[field] = value;
        },
        () => updatePlan({id: planId, trainingPlanUpdateRequest: {[field]: value}}).unwrap(),
        "Couldn't save changes",
      ).catch(() => undefined);
    },
    [commit, plan, planId, updatePlan],
  );

  return {
    addExercises,
    addSet,
    addWorkout,
    dropSet,
    editSet,
    isAddingWorkout,
    isRemovingWorkout,
    moveExercise,
    removeExercise,
    removeWorkout,
    renameWorkout,
    scheduleDay,
    setPlanDate,
  };
}

export type PlanBuilderCommands = ReturnType<typeof usePlanBuilder>;

/**
 * The same commands, narrowed to one workout.
 *
 * The workout panel used to take the whole command object and pass `workout.id`
 * back on every call — so it could reach any workout, and each call site had to
 * remember which one it meant. Here the id is bound once and nothing below can
 * name another workout.
 */
export interface WorkoutActions {
  rename: (name: string) => void;
  /** Awaited only so the confirm dialog can close when the delete settles. */
  remove: () => Promise<void>;
  isRemoving: boolean;
  toggleDay: (day: Day, isSelected: boolean) => void;
  addExercises: (exercises: TrainingExercise[]) => void;
  removeExercise: (elementId: string) => void;
  moveExercise: (from: number, to: number) => void;
  addSet: (elementId: string) => void;
  removeSet: (elementId: string, setIndex: number) => void;
}

/**
 * A plain function, not a hook: the panel it feeds is not memoised, so a fresh
 * object each render costs nothing, and skipping `useMemo` saves a nine-entry
 * dependency array that would have to be kept in step by hand.
 */
export function workoutActions(commands: PlanBuilderCommands, workoutId: string): WorkoutActions {
  const ignore = () => undefined;

  return {
    rename: (name) => commands.renameWorkout(workoutId, name).catch(ignore),
    remove: () => commands.removeWorkout(workoutId),
    isRemoving: commands.isRemovingWorkout,
    toggleDay: (day, isSelected) => commands.scheduleDay(day, isSelected ? workoutId : null).catch(ignore),
    addExercises: (exercises) => commands.addExercises(workoutId, exercises).catch(ignore),
    removeExercise: (elementId) => commands.removeExercise(workoutId, elementId).catch(ignore),
    moveExercise: (from, to) => commands.moveExercise(workoutId, from, to).catch(ignore),
    addSet: commands.addSet,
    removeSet: commands.dropSet,
  };
}

/**
 * Which workout the builder is showing. It lives in the URL so a refresh, a
 * deep link and browser Back all land on the same workout; `replace` keeps tab
 * switching out of the history stack.
 */
export function useActiveWorkout(workouts: TrainingPlanWorkout[]) {
  const [params, setParams] = useSearchParams();
  const active = workouts.find((workout) => workout.id === params.get('w')) ?? workouts[0];

  const select = useCallback(
    (workoutId: string) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('w', workoutId);
          return next;
        },
        {replace: true},
      );
    },
    [setParams],
  );

  return [active, select] as const;
}
