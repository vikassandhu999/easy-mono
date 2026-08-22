import {isOneOf} from '@easy/utils/closed-vocabulary';
import {toast} from '@heroui/react';

import {toastMutationError} from '@/@components/mutation-toast';
import type {TrainingExercise} from '@/api/training-exercises';
import type {TrainingPlan, TrainingPlanWorkout, TrainingPlanWorkoutExercise} from '@/api/training-plan-builder';
import * as api from '@/api/training-plan-builder';
import {createLocalNodeId} from '@/api/training-prescription';
import {createCoalescingQueue} from '@/builder-kit/coalescing-queue';
import {periodError} from '@/clients/lib/plan-coverage';
import {handleStaleTrainingPlanConflict} from '@/training-plans/lib/stale-training-plan-conflict';
import {findElement, findWorkout, moveId} from './plan-tree';
import {clearWorkoutFromSchedule, type Day, setScheduleDay} from './schedule';
import {appendSet, blankSet, type PlannedSet, patchSet, removeSet} from './sets';
import {TRACKING_TYPES} from './tracking';

export const SET_EDIT_DEBOUNCE_MS = 600;
export type BusyKey = 'addWorkout' | 'removeWorkout';

type PositionedNode = {position: number};

function nextPosition(nodes: PositionedNode[]): number {
  return Math.max(-1, ...nodes.map((node) => node.position)) + 1;
}

export function createPlanCommands(planId: string, notifyBusy: (key: BusyKey, busy: boolean) => void) {
  const patch = (recipe: (plan: TrainingPlan) => void) => api.patchPlan(planId, recipe);
  const read = () => api.readPlan(planId);
  let writes: Promise<unknown> = Promise.resolve();
  let writeEpoch = 0;

  const serialize = <T>(write: () => Promise<T>): Promise<T> => {
    const result = writes.then(write, write);
    writes = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const handleStaleConflict = async (error: unknown) => {
    const handled = await handleStaleTrainingPlanConflict<TrainingPlan>(error, {
      refetchLatest: () => api.refetchTrainingPlan(planId),
      replaceWithLatest: (latest) => {
        patch((draft) => {
          Object.assign(draft, latest);
        });
      },
      notify: (message) => {
        toast.info(message, {timeout: 4000});
      },
    });

    if (handled) {
      writeEpoch += 1;
    }

    return handled;
  };

  const savePrescription = <Marker, Result>(
    recipe: (plan: TrainingPlan) => Marker,
    resolve: (saved: TrainingPlan, marker: Marker) => Result,
    failMessage: string,
  ): Promise<Result | undefined> => {
    const requestedEpoch = writeEpoch;

    return serialize(async () => {
      if (requestedEpoch !== writeEpoch) {
        return undefined;
      }

      let marker: Marker | undefined;
      const patched = patch((plan) => {
        marker = recipe(plan);
      });
      const plan = read();
      if (!plan || marker === undefined) {
        patched.undo();
        return undefined;
      }

      try {
        const saved = await api.replacePrescription(planId, plan);
        patch((draft) => {
          Object.assign(draft, saved);
        });
        return resolve(saved, marker);
      } catch (error) {
        patched.undo();
        if (await handleStaleConflict(error)) {
          return undefined;
        }
        toastMutationError(error, failMessage);
        return undefined;
      }
    });
  };

  const addWorkout = async (): Promise<TrainingPlanWorkout | undefined> => {
    notifyBusy('addWorkout', true);
    try {
      const result = await savePrescription(
        (plan) => {
          const position = nextPosition(plan.workouts);
          const timestamp = new Date().toISOString();
          plan.workouts.push({
            id: createLocalNodeId('workout'),
            inserted_at: timestamp,
            updated_at: timestamp,
            name: 'New workout',
            position,
            training_plan_id: plan.id,
            weekdays: [],
            workout_elements: [],
          });
          return position;
        },
        (saved, position) => saved.workouts.find((workout) => workout.position === position),
        "Couldn't add workout",
      );
      return result;
    } finally {
      notifyBusy('addWorkout', false);
    }
  };

  const renameWorkout = (workoutId: string, name: string) =>
    savePrescription(
      (plan) => {
        const workout = findWorkout(plan, workoutId);
        if (workout) {
          workout.name = name;
        }
        return workoutId;
      },
      () => undefined,
      "Couldn't save changes",
    );

  const removeWorkout = async (workoutId: string) => {
    notifyBusy('removeWorkout', true);
    try {
      await savePrescription(
        (plan) => {
          plan.workouts = plan.workouts.filter((workout) => workout.id !== workoutId);
          plan.schedule = clearWorkoutFromSchedule(plan.schedule, workoutId);
          return workoutId;
        },
        () => undefined,
        "Couldn't delete workout",
      );
    } finally {
      notifyBusy('removeWorkout', false);
    }
  };

  const scheduleDay = (day: Day, workoutId: null | string) =>
    savePrescription(
      (plan) => {
        plan.schedule = setScheduleDay(plan.schedule, day, workoutId);
        return day;
      },
      () => undefined,
      "Couldn't save changes",
    );

  const addExercises = (workoutId: string, exercises: TrainingExercise[]) => {
    if (exercises.length === 0) {
      return Promise.resolve(undefined);
    }

    return savePrescription(
      (plan) => {
        const workout = findWorkout(plan, workoutId);
        if (!workout) {
          return workoutId;
        }
        const timestamp = new Date().toISOString();
        const startPosition = nextPosition(workout.workout_elements);
        const appended = exercises.map<TrainingPlanWorkoutExercise>((exercise, offset) => ({
          id: createLocalNodeId('exercise'),
          inserted_at: timestamp,
          updated_at: timestamp,
          workout_id: workout.id,
          exercise_id: exercise.id,
          exercise: {
            id: exercise.id,
            name: exercise.name,
            force: exercise.force,
            mechanics: exercise.mechanics,
            // The library exercise carries `tracking_type` as a bare string; the
            // Prescription contract's is the closed vocabulary.
            tracking_type: isOneOf(TRACKING_TYPES, exercise.tracking_type) ? exercise.tracking_type : 'weight_reps',
            images: exercise.images,
          },
          position: startPosition + offset,
          planned_sets: [blankSet()],
        }));
        workout.workout_elements.push(...appended);
        return workoutId;
      },
      () => undefined,
      "Couldn't add exercises",
    );
  };

  const removeExercise = (workoutId: string, elementId: string) =>
    savePrescription(
      (plan) => {
        const workout = findWorkout(plan, workoutId);
        if (workout) {
          workout.workout_elements = workout.workout_elements.filter((element) => element.id !== elementId);
        }
        return elementId;
      },
      () => undefined,
      "Couldn't remove exercise",
    );

  const moveExercise = (workoutId: string, from: number, to: number) =>
    savePrescription(
      (plan) => {
        const workout = findWorkout(plan, workoutId);
        if (!workout) {
          return workoutId;
        }
        const order = moveId(
          workout.workout_elements.map((element) => element.id),
          from,
          to,
        );
        const byId = new Map(workout.workout_elements.map((element) => [element.id, element]));
        workout.workout_elements = order.flatMap((id, position) => {
          const element = byId.get(id);
          return element ? [{...element, position}] : [];
        });
        return workoutId;
      },
      () => undefined,
      "Couldn't reorder exercises",
    );

  const pendingSetEdits = new Map<string, {epoch: number; recipe: (plan: TrainingPlan) => string}>();
  const setQueue = createCoalescingQueue(async (elementId) => {
    const pending = pendingSetEdits.get(elementId);
    pendingSetEdits.delete(elementId);
    if (pending?.epoch === writeEpoch) {
      await savePrescription(pending.recipe, () => undefined, "Couldn't save set");
    }
  });

  const writeSets = (elementId: string, recipe: (sets: PlannedSet[]) => PlannedSet[], delayMs = 0) => {
    const previous = pendingSetEdits.get(elementId);
    const epoch = writeEpoch;
    pendingSetEdits.set(elementId, {
      epoch,
      recipe: (plan) => {
        if (previous?.epoch === epoch) {
          previous.recipe(plan);
        }
        const found = findElement(plan, elementId);
        if (found) {
          found.element.planned_sets = recipe(found.element.planned_sets);
        }
        return elementId;
      },
    });
    setQueue.mark(elementId, delayMs);
  };

  const editSet = (elementId: string, index: number, values: Partial<PlannedSet>) =>
    writeSets(elementId, (sets) => patchSet(sets, index, values), SET_EDIT_DEBOUNCE_MS);
  const addSet = (elementId: string) => writeSets(elementId, appendSet);
  const dropSet = (elementId: string, index: number) => writeSets(elementId, (sets) => removeSet(sets, index));

  const setPlanPeriod = (startDate: string | null, endDate: string | null): Promise<void> => {
    const requestedEpoch = writeEpoch;

    return serialize(async () => {
      if (requestedEpoch !== writeEpoch) {
        return;
      }

      const error = periodError(startDate, endDate);
      if (error) {
        toast.danger(error);
        return;
      }
      const patched = patch((plan) => {
        plan.start_date = startDate;
        plan.end_date = endDate;
      });
      try {
        const saved = await api.updatePlanPeriod(planId, {start_date: startDate, end_date: endDate});
        patch((draft) => {
          Object.assign(draft, saved);
        });
      } catch (error) {
        patched.undo();
        if (await handleStaleConflict(error)) {
          return;
        }
        toastMutationError(error, "Couldn't save changes");
      }
    });
  };

  return {
    addExercises,
    addSet,
    addWorkout,
    dropSet,
    editSet,
    flush: async () => {
      await setQueue.flushPending();
      await writes;
    },
    moveExercise,
    removeExercise,
    removeWorkout,
    renameWorkout,
    scheduleDay,
    setPlanPeriod,
  };
}
