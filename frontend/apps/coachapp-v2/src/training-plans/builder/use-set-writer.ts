/**
 * Serialised writes for one exercise's `planned_sets`.
 *
 * The API replaces the whole array, so two PATCHes built from the same base
 * silently lose one another's edit. That used to be the shape of this screen:
 * the set editor (debounced field edits), "add set" and "remove set" each
 * rebuilt the array from their OWN copy of the element. The debounce, the
 * disabled "+ Add set" button and two refs in the editor were all mitigations
 * for it.
 *
 * Three rules make the race impossible instead:
 *
 *   1. The cache is the only base. A command mutates the cached array; the
 *      request always sends the array as it is at send time, never a snapshot
 *      some component closed over.
 *   2. At most one request per element is in flight. A command arriving during
 *      one doesn't start a second — it marks the queue dirty and the running
 *      loop sends again with the newer array.
 *   3. The debounce lives here, not in the editor, so structural commands
 *      (add / remove) can be immediate while typing coalesces.
 *
 * Recovery is a re-read, not an undo: a failed write may be the tail of a
 * coalesced chain, so reversing one patch out of order would leave the cache
 * describing a state nobody believes in.
 */
import {useCallback, useEffect, useRef} from 'react';

import {toastMutationError} from '@/@components/mutation-toast';
import {useUpdateWorkoutElementMutation} from '@/api/generated';
import {usePlanPatcher, usePlanReader, usePlanRefetch} from '@/api/training-plan-builder';

import {findElement, type PlannedSet} from './model';

/** Long enough that a typed number isn't sent per keystroke. */
export const SET_EDIT_DEBOUNCE_MS = 600;

export type SetsRecipe = (sets: PlannedSet[]) => PlannedSet[];

interface Queue {
  timer: ReturnType<typeof setTimeout> | null;
  /** There are changes in the cache the server has not been told about yet. */
  dirty: boolean;
  running: boolean;
}

export function useSetWriter(planId: string) {
  const patch = usePlanPatcher(planId);
  const readPlan = usePlanReader(planId);
  const refetchPlan = usePlanRefetch(planId);
  const [updateElement] = useUpdateWorkoutElementMutation();
  const queues = useRef(new Map<string, Queue>());

  const queueFor = useCallback((elementId: string): Queue => {
    let queue = queues.current.get(elementId);
    if (!queue) {
      queue = {timer: null, dirty: false, running: false};
      queues.current.set(elementId, queue);
    }
    return queue;
  }, []);

  const send = useCallback(
    async (elementId: string) => {
      const queue = queueFor(elementId);
      queue.timer = null;
      if (queue.running) {
        return;
      }
      queue.running = true;
      try {
        while (queue.dirty) {
          queue.dirty = false;
          const plan = readPlan();
          const sets = plan && findElement(plan, elementId)?.element.planned_sets;
          if (!sets) {
            break;
          }
          await updateElement({
            id: elementId,
            trainingWorkoutExerciseRequest: {planned_sets: sets},
          }).unwrap();
        }
      } catch (error) {
        queue.dirty = false;
        toastMutationError(error, "Couldn't save set");
        refetchPlan();
      } finally {
        queue.running = false;
      }
    },
    [queueFor, readPlan, refetchPlan, updateElement],
  );

  /** Applies `recipe` to the element's sets, then schedules the write. */
  const write = useCallback(
    (elementId: string, recipe: SetsRecipe, delayMs = 0) => {
      patch((plan) => {
        const found = findElement(plan, elementId);
        if (found) {
          found.element.planned_sets = recipe(found.element.planned_sets);
        }
      });

      const queue = queueFor(elementId);
      queue.dirty = true;
      if (queue.timer) {
        clearTimeout(queue.timer);
      }
      if (delayMs === 0) {
        send(elementId).catch(() => undefined);
      } else {
        queue.timer = setTimeout(() => {
          send(elementId).catch(() => undefined);
        }, delayMs);
      }
    },
    [patch, queueFor, send],
  );

  // Leaving the screen must not drop a debounced edit. `send` closes over
  // nothing that changes — it reads the plan through the store — so this
  // cleanup runs on unmount and nowhere else. (The old editor needed a ref here
  // precisely because its save closed over a prop its own writes rewrote, so
  // the cleanup fired mid-session with stale data. Even if this identity did
  // churn, the worst case is sending sooner than the debounce asked.)
  useEffect(() => {
    const pending = queues.current;
    return () => {
      for (const [elementId, queue] of pending) {
        if (queue.timer) {
          clearTimeout(queue.timer);
          send(elementId).catch(() => undefined);
        }
      }
    };
  }, [send]);

  return write;
}
