/**
 * Writes to one meal item's amount (`weight_g` / `amount` / `unit`). Edits
 * debounce per keystroke, so writes go through `createCoalescingQueue` — one
 * request per item in flight, with the latest patch held in a pending map so
 * what goes out is always the newest edit, never a snapshot a timer closed
 * over.
 *
 * Unlike the training set writer, a successful send REFETCHES: nutrition
 * snapshots (item, meal and therefore the energy line) are server-computed,
 * so the cache must reconcile after every amount change. That is also why the
 * payload comes from the pending map rather than the cache — a reconciling
 * refetch landing mid-chain can briefly rewind the cached item, and a send
 * that read the cache would re-send the old value.
 *
 * Failure recovery is a re-read too, not `patch.undo()`: a failed write can be
 * the tail of a coalesced chain, so reversing one patch out of order would
 * leave the cache describing a state neither side believes in.
 */
import {useCallback, useEffect, useMemo, useRef} from 'react';

import {toastMutationError} from '@/@components/mutation-toast';
import {usePlanPatcher, usePlanRefetch, useUpdateMealItemMutation} from '@/api/nutrition-plan-builder';
import {createCoalescingQueue} from '@/builder-kit/coalescing-queue';

import {findItem} from './plan-tree';

/** Long enough that a typed amount isn't sent per keystroke. */
export const ITEM_EDIT_DEBOUNCE_MS = 600;

/** What an amount edit writes. Every edit passes all three keys — an item is
 *  either weighed (`weight_g` only) or serving-based (`amount` + `unit`). */
export type ItemAmountPatch = {weight_g: number | null; amount: number | null; unit: string | null};

export type ItemWriter = (itemId: string, values: ItemAmountPatch) => void;

export function useItemWriter(planId: string): ItemWriter {
  const patch = usePlanPatcher(planId);
  const refetchPlan = usePlanRefetch(planId);
  const updateMealItemMutation = useUpdateMealItemMutation();

  const pending = useRef(new Map<string, ItemAmountPatch>());
  const queue = useMemo(
    () =>
      createCoalescingQueue(async (itemId) => {
        const body = pending.current.get(itemId);
        pending.current.delete(itemId);
        if (!body) {
          return;
        }
        try {
          await updateMealItemMutation.mutateAsync({id: itemId, body});
          refetchPlan();
        } catch (error) {
          toastMutationError(error, "Couldn't save amount");
          refetchPlan();
        }
      }),
    [refetchPlan, updateMealItemMutation],
  );

  /** Applies the values to the cached item, then schedules the write. */
  const write = useCallback<ItemWriter>(
    (itemId, values) => {
      patch((plan) => {
        const found = findItem(plan, itemId);
        if (found) {
          Object.assign(found.item, values);
        }
      });
      pending.current.set(itemId, values);
      queue.mark(itemId, ITEM_EDIT_DEBOUNCE_MS);
    },
    [patch, queue],
  );

  // Leaving the screen must not drop a debounced edit. The queue's identity is
  // stable — its send closes over refs, not render values — so this cleanup
  // runs on unmount and nowhere else.
  useEffect(() => () => queue.flushPending(), [queue]);

  return write;
}
