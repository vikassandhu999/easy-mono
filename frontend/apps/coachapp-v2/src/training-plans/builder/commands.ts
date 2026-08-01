/**
 * Every write the training builder can perform, as plain functions — no hooks,
 * no dependency arrays, nothing whose identity can go stale (RM-142's whole
 * genus). `createPlanCommands(planId)` closes over the plan id only; every
 * payload is built from the CACHE at press time — the current truth, never the
 * props a component last rendered — and replies are folded back in.
 *
 * Three write shapes, three protocols:
 *
 * - **Replace-shaped, single-shot** (rename, delete, remove exercise, dates):
 *   optimistic patch → request → undo + toast on failure.
 *
 * - **Create-shaped** (add workout, add exercises): request → patch the reply
 *   in. The server owns the ids, so there is nothing truthful to show until it
 *   answers; one toast covers a failure.
 *
 * - **Whole-replaced collections** (an element's planned sets, the weekday
 *   schedule, a workout's exercise order): serialized per resource through one
 *   coalescing channel. Two concurrent full-replaces silently drop one
 *   another's change, so the channel keeps one request in flight per resource
 *   and always sends the LATEST payload — captured at patch time and held in
 *   the channel, so no refetch landing in between can rewrite what the coach
 *   expressed. Failure recovery is toast + refetch: a failed write can be the
 *   tail of a coalesced chain, and undoing one patch out of order would leave
 *   the cache describing a state neither side believes in.
 */
import {toast} from '@heroui/react';

import {toastMutationError} from '@/@components/mutation-toast';
import type {TrainingExercise} from '@/api/training-exercises';
import type {TrainingPlan, TrainingPlanWorkout} from '@/api/training-plan-builder';
import * as api from '@/api/training-plan-builder';
import {createCoalescingQueue} from '@/builder-kit/coalescing-queue';

import {findElement, findWorkout, moveId} from './plan-tree';
import {clearWorkoutFromSchedule, type Day, setScheduleDay} from './schedule';
import {appendSet, blankSet, type PlannedSet, patchSet, removeSet} from './sets';

/** Long enough that a typed number isn't sent per keystroke. */
export const SET_EDIT_DEBOUNCE_MS = 600;

/** The two waits the screen shows a spinner for. */
export type BusyKey = 'addWorkout' | 'removeWorkout';

export function createPlanCommands(planId: string, notifyBusy: (key: BusyKey, busy: boolean) => void) {
  const patch = (recipe: (plan: TrainingPlan) => void) => api.patchPlan(planId, recipe);
  const read = () => api.readPlan(planId);

  /** Show the change at once; put it back and say so if the server refuses. */
  const commit = async (recipe: (plan: TrainingPlan) => void, run: () => Promise<unknown>, failMessage: string) => {
    const patched = patch(recipe);
    try {
      await run();
    } catch (error) {
      patched.undo();
      toastMutationError(error, failMessage);
    }
  };

  // The coalescing channels. `pending` maps a channel key to the send that
  // carries the latest payload; marking a busy channel overwrites the entry,
  // and the queue's loop drains it after the in-flight request settles.
  const pending = new Map<string, () => Promise<void>>();
  const queue = createCoalescingQueue(async (key) => {
    const send = pending.get(key);
    pending.delete(key);
    await send?.();
  });
  const enqueue = (key: string, send: () => Promise<void>, delayMs = 0) => {
    pending.set(key, send);
    queue.mark(key, delayMs);
  };

  // -------------------------------------------------------------------------
  // Workouts
  // -------------------------------------------------------------------------

  /** Resolves to the created workout so the caller can select and rename it. */
  const addWorkout = async (): Promise<TrainingPlanWorkout | undefined> => {
    notifyBusy('addWorkout', true);
    try {
      const workout = await api.createWorkout(planId, {name: 'New workout'});
      patch((plan) => {
        plan.workouts.push(workout);
      });
      return workout;
    } catch (error) {
      toastMutationError(error, "Couldn't add workout");
      return undefined;
    } finally {
      notifyBusy('addWorkout', false);
    }
  };

  const renameWorkout = (workoutId: string, name: string) =>
    commit(
      (plan) => {
        const workout = findWorkout(plan, workoutId);
        if (workout) {
          workout.name = name;
        }
      },
      () => api.updateWorkout(workoutId, {name}),
      "Couldn't save changes",
    );

  /** Resolves after the delete settles either way — the confirm dialog waits on it. */
  const removeWorkout = (workoutId: string) =>
    commit(
      (plan) => {
        plan.workouts = plan.workouts.filter((workout) => workout.id !== workoutId);
        // The backend deletes the workout, and its weekdays go with it; mirror
        // that, or the weekday chips keep pointing at a workout that is gone.
        plan.schedule = clearWorkoutFromSchedule(plan.schedule, workoutId);
      },
      async () => {
        notifyBusy('removeWorkout', true);
        try {
          await api.deleteWorkout(workoutId);
        } finally {
          notifyBusy('removeWorkout', false);
        }
      },
      "Couldn't delete workout",
    );

  // -------------------------------------------------------------------------
  // Schedule
  // -------------------------------------------------------------------------

  /**
   * The schedule is written whole: one PUT carrying all seven weekdays. A
   * weekday holds at most one workout, so assigning a day implicitly takes it
   * off whichever workout held it — that falls out of building the next map
   * rather than being a rule either side has to remember. Whole-map writes go
   * through the channel so two quick chip presses can't overwrite each other.
   */
  const scheduleDay = (day: Day, workoutId: null | string) => {
    const plan = read();
    if (!plan) {
      return;
    }
    const next = setScheduleDay(plan.schedule, day, workoutId);
    patch((draft) => {
      draft.schedule = next;
    });
    enqueue('schedule', async () => {
      try {
        await api.replaceSchedule(planId, next);
      } catch (error) {
        toastMutationError(error, "Couldn't save changes");
        api.refetchPlan(planId);
      }
    });
  };

  // -------------------------------------------------------------------------
  // Exercises
  // -------------------------------------------------------------------------

  /**
   * One request for the whole pick. The server appends them in the order given
   * inside a single transaction, so there is no half-added state to reconcile:
   * either every exercise lands or none does, and one toast covers the failure.
   */
  const addExercises = async (workoutId: string, exercises: TrainingExercise[]) => {
    if (exercises.length === 0) {
      return;
    }
    try {
      const elements = await api.createElements(workoutId, {
        exercises: exercises.map((exercise) => ({
          exercise_id: exercise.id,
          planned_sets: [blankSet()],
        })),
      });
      patch((plan) => {
        findWorkout(plan, workoutId)?.workout_elements.push(...elements);
      });
    } catch (error) {
      toastMutationError(error, "Couldn't add exercises");
    }
  };

  const removeExercise = (workoutId: string, elementId: string) =>
    commit(
      (plan) => {
        const workout = findWorkout(plan, workoutId);
        if (workout) {
          workout.workout_elements = workout.workout_elements.filter((element) => element.id !== elementId);
        }
      },
      () => api.deleteElement(elementId),
      "Couldn't remove exercise",
    );

  const moveExercise = (workoutId: string, from: number, to: number) => {
    const plan = read();
    const workout = plan && findWorkout(plan, workoutId);
    if (!workout) {
      return;
    }
    const order = moveId(
      workout.workout_elements.map((element) => element.id),
      from,
      to,
    );
    patch((draft) => {
      const target = findWorkout(draft, workoutId);
      if (!target) {
        return;
      }
      const byId = new Map(target.workout_elements.map((element) => [element.id, element]));
      target.workout_elements = order.flatMap((id, position) => {
        const element = byId.get(id);
        return element ? [{...element, position}] : [];
      });
    });
    enqueue(`order:${workoutId}`, async () => {
      const current = read();
      if (!current || !findWorkout(current, workoutId)) {
        return;
      }
      try {
        await api.reorderElements(workoutId, order);
      } catch (error) {
        toastMutationError(error, "Couldn't reorder exercises");
        api.refetchPlan(planId);
      }
    });
  };

  // -------------------------------------------------------------------------
  // Sets — the API replaces an element's whole `planned_sets` on every edit
  // -------------------------------------------------------------------------

  const writeSets = (elementId: string, recipe: (sets: PlannedSet[]) => PlannedSet[], delayMs = 0) => {
    patch((plan) => {
      const found = findElement(plan, elementId);
      if (found) {
        found.element.planned_sets = recipe(found.element.planned_sets);
      }
    });
    // Capture the payload NOW, from the patch just applied — what goes out is
    // what the coach expressed, even if a recovery refetch rewrites the cache
    // before the debounce fires.
    const plan = read();
    const sets = plan && findElement(plan, elementId)?.element.planned_sets;
    if (!sets) {
      return;
    }
    const key = `sets:${elementId}`;
    enqueue(
      key,
      async () => {
        const current = read();
        if (!current || !findElement(current, elementId)) {
          // The element was removed while this edit waited; nothing to save.
          return;
        }
        try {
          const saved = await api.updateElement(elementId, {planned_sets: sets});
          // The reply is authoritative — fold it in, unless the coach has
          // typed again since (the channel holds a newer payload whose own
          // reply will land after this one).
          if (!pending.has(key)) {
            patch((draft) => {
              const found = findElement(draft, elementId);
              if (found) {
                found.element.planned_sets = saved.planned_sets;
              }
            });
          }
        } catch (error) {
          toastMutationError(error, "Couldn't save set");
          api.refetchPlan(planId);
        }
      },
      delayMs,
    );
  };

  const editSet = (elementId: string, index: number, values: Partial<PlannedSet>) =>
    writeSets(elementId, (sets) => patchSet(sets, index, values), SET_EDIT_DEBOUNCE_MS);

  const addSet = (elementId: string) => writeSets(elementId, appendSet);

  const dropSet = (elementId: string, index: number) => writeSets(elementId, (sets) => removeSet(sets, index));

  // -------------------------------------------------------------------------
  // Assignment period
  // -------------------------------------------------------------------------

  const setPlanDate = (field: 'end_date' | 'start_date', value: string | null) => {
    const plan = read();
    if (!plan || (plan[field] ?? null) === value) {
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
      () => api.updatePlanPeriod(planId, {[field]: value}),
      "Couldn't save changes",
    ).catch(() => undefined);
  };

  return {
    addExercises,
    addSet,
    addWorkout,
    dropSet,
    editSet,
    /** Send every debounced edit now. For unmount. */
    flush: queue.flushPending,
    moveExercise,
    removeExercise,
    removeWorkout,
    renameWorkout,
    scheduleDay,
    setPlanDate,
  };
}
