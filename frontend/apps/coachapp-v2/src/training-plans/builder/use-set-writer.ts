/**
 * Writes to one exercise's `planned_sets`. The API replaces the whole array,
 * so writes go through `createCoalescingQueue` — one request per exercise in
 * flight, and the send reads the cache rather than a captured payload.
 *
 * Recovery is a re-read, not `patch.undo()`: a failed write can be the tail of
 * a coalesced chain, so reversing one patch out of order would leave the cache
 * describing a state neither side believes in.
 */
import {useCallback, useEffect, useMemo, useRef} from 'react';

import {toastMutationError} from '@/@components/mutation-toast';
import {
  usePlanPatcher,
  usePlanReader,
  usePlanRefetch,
  useUpdateWorkoutElementMutation,
} from '@/api/training-plan-builder';
import {createCoalescingQueue} from '@/builder-kit/coalescing-queue';

import {findElement} from './plan-tree';
import type {PlannedSet} from './sets';

/** Long enough that a typed number isn't sent per keystroke. */
export const SET_EDIT_DEBOUNCE_MS = 600;

export type SetsRecipe = (sets: PlannedSet[]) => PlannedSet[];

export function useSetWriter(planId: string) {
  const patch = usePlanPatcher(planId);
  const readPlan = usePlanReader(planId);
  const refetchPlan = usePlanRefetch(planId);
  const updateElementMutation = useUpdateWorkoutElementMutation();

  // The mutation RESULT is a new object every render, so it must not be a
  // memo dependency — a per-render queue would let the unmount-flush effect
  // fire the old queue's timer on every keystroke, defeating the debounce and
  // the one-in-flight guarantee. The queue depends only on the plan-stable
  // callbacks and reads the send function through a ref.
  const sendElementRef = useRef(updateElementMutation.mutateAsync);
  sendElementRef.current = updateElementMutation.mutateAsync;
  const queue = useMemo(
    () =>
      createCoalescingQueue(async (elementId) => {
        const plan = readPlan();
        const sets = plan && findElement(plan, elementId)?.element.planned_sets;
        if (!sets) {
          return;
        }
        try {
          await sendElementRef.current({id: elementId, body: {planned_sets: sets}});
        } catch (error) {
          toastMutationError(error, "Couldn't save set");
          refetchPlan();
        }
      }),
    [readPlan, refetchPlan],
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
      queue.mark(elementId, delayMs);
    },
    [patch, queue],
  );

  // Leaving the screen must not drop a debounced edit. The queue's identity is
  // stable — it reads the plan through the store rather than closing over it —
  // so this cleanup runs on unmount and nowhere else.
  useEffect(() => () => queue.flushPending(), [queue]);

  return write;
}
