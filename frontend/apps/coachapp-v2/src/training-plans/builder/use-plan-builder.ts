/**
 * Every write the training builder can perform, in one place. Components call
 * these and render what they are given; none of them touch the cache directly.
 * The optimistic protocol — patch, request, undo on failure, toast — lives in
 * `commit`. Set writes go through `useSetWriter` because the whole array is
 * replaced on every edit and needs serialising.
 */
import {toast} from '@heroui/react';
import {useCallback} from 'react';
import {useSearchParams} from 'react-router-dom';

import {toastMutationError} from '@/@components/mutation-toast';
import type {TrainingExercise} from '@/api/training-exercises';
import type {TrainingPlan, TrainingPlanWorkout} from '@/api/training-plan-builder';
import {
  useCreateWorkoutElementsMutation,
  useCreateWorkoutMutation,
  useDeleteWorkoutElementMutation,
  useDeleteWorkoutMutation,
  usePlanPatcher,
  useReorderWorkoutElementsMutation,
  useUpdateTrainingPlanScheduleMutation,
  useUpdateWorkoutMutation,
} from '@/api/training-plan-builder';
import {useUpdateTrainingPlanMutation} from '@/api/training-plans-list';

import {findWorkout, moveId} from './plan-tree';
import {clearWorkoutFromSchedule, type Day, setScheduleDay} from './schedule';
import {appendSet, blankSet, type PlannedSet, patchSet, removeSet} from './sets';
import {SET_EDIT_DEBOUNCE_MS, useSetWriter} from './use-set-writer';

export function usePlanBuilder(plan: TrainingPlan) {
  const planId = plan.id;
  const patch = usePlanPatcher(planId);
  const writeSets = useSetWriter(planId);

  const createWorkoutMutation = useCreateWorkoutMutation();
  const updateWorkoutMutation = useUpdateWorkoutMutation();
  const deleteWorkoutMutation = useDeleteWorkoutMutation();
  const updateScheduleMutation = useUpdateTrainingPlanScheduleMutation();
  const createElementsMutation = useCreateWorkoutElementsMutation();
  const deleteElementMutation = useDeleteWorkoutElementMutation();
  const reorderElementsMutation = useReorderWorkoutElementsMutation();
  const updatePlanMutation = useUpdateTrainingPlanMutation();
  const isAddingWorkout = createWorkoutMutation.isPending;
  const isRemovingWorkout = deleteWorkoutMutation.isPending;

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
      const {data: workout} = await createWorkoutMutation.mutateAsync({
        planId,
        body: {name: 'New workout'},
      });
      patch((draft) => {
        draft.workouts.push(workout);
      });
      return workout;
    } catch (error) {
      toastMutationError(error, "Couldn't add workout");
      return undefined;
    }
  }, [createWorkoutMutation, patch, planId]);

  const renameWorkout = useCallback(
    (workoutId: string, name: string) =>
      commit(
        (draft) => {
          const workout = findWorkout(draft, workoutId);
          if (workout) {
            workout.name = name;
          }
        },
        () => updateWorkoutMutation.mutateAsync({id: workoutId, body: {name}}),
        "Couldn't save changes",
      ),
    [commit, updateWorkoutMutation],
  );

  const removeWorkout = useCallback(
    (workoutId: string) =>
      commit(
        (draft) => {
          draft.workouts = draft.workouts.filter((workout) => workout.id !== workoutId);
          // The backend deletes the workout, and its weekdays go with it; mirror
          // that, or the weekday chips keep pointing at a workout that is gone.
          draft.schedule = clearWorkoutFromSchedule(draft.schedule, workoutId);
        },
        () => deleteWorkoutMutation.mutateAsync(workoutId),
        "Couldn't delete workout",
      ),
    [commit, deleteWorkoutMutation],
  );

  // -------------------------------------------------------------------------
  // Schedule
  // -------------------------------------------------------------------------

  /**
   * The schedule is written whole: one PUT carrying all seven weekdays. A
   * weekday holds at most one workout, so assigning a day implicitly takes it
   * off whichever workout held it — that falls out of building the next map
   * rather than being a rule either side has to remember.
   */
  const scheduleDay = useCallback(
    (day: Day, workoutId: null | string) => {
      const next = setScheduleDay(plan.schedule, day, workoutId);
      return commit(
        (draft) => {
          draft.schedule = next;
        },
        () => updateScheduleMutation.mutateAsync({planId, body: next}),
        "Couldn't save changes",
      );
    },
    [commit, plan.schedule, planId, updateScheduleMutation],
  );

  // -------------------------------------------------------------------------
  // Exercises
  // -------------------------------------------------------------------------

  /**
   * One request for the whole pick. The server appends them in the order given
   * inside a single transaction, so there is no half-added state to reconcile:
   * either every exercise lands or none does, and one toast covers the failure.
   */
  const addExercises = useCallback(
    async (workoutId: string, exercises: TrainingExercise[]) => {
      if (exercises.length === 0) {
        return;
      }
      try {
        const {data: elements} = await createElementsMutation.mutateAsync({
          workoutId,
          body: {
            exercises: exercises.map((exercise) => ({
              exercise_id: exercise.id,
              planned_sets: [blankSet()],
            })),
          },
        });
        patch((draft) => {
          findWorkout(draft, workoutId)?.workout_elements.push(...elements);
        });
      } catch (error) {
        toastMutationError(error, "Couldn't add exercises");
      }
    },
    [createElementsMutation, patch],
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
        () => deleteElementMutation.mutateAsync(elementId),
        "Couldn't remove exercise",
      ),
    [commit, deleteElementMutation],
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
        () => reorderElementsMutation.mutateAsync({workoutId, body: {element_ids: order}}),
        "Couldn't reorder exercises",
      );
    },
    [commit, plan, reorderElementsMutation],
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
        () => updatePlanMutation.mutateAsync({id: planId, body: {[field]: value}}),
        "Couldn't save changes",
      ).catch(() => undefined);
    },
    [commit, plan, planId, updatePlanMutation],
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
