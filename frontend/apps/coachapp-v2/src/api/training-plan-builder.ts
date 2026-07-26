/**
 * The training builder's data layer — the ONLY module that names the builder's
 * cache entry or writes to it. Everything above works in plan-shaped values and
 * never imports `coachApi`.
 *
 * One entry, one key. `getTrainingPlan({id})` already returns the whole tree:
 * workouts, their elements, each element's exercise (with `tracking_type`), the
 * planned sets, and the weekday schedule as `plan_items` — server-ordered by
 * `TrainingWorkout.oldest()` and `TrainingWorkoutExercise.by_position()`. The
 * builder used to fetch `listWorkouts` and `getTrainingPlanSchedule` on top of
 * it, which put the literal `{planId, limit: 100}` at nine hand-written call
 * sites. RTK Query matches cache keys by VALUE, so changing that limit would
 * have pointed every optimistic write at an entry nobody reads — silently, with
 * no type error. There is now no second key left to get wrong.
 */
import {useCallback} from 'react';
import {useStore} from 'react-redux';

import {coachApi, type TrainingPlan, useGetTrainingPlanQuery} from '@/api/generated';
import type {RootState} from '@/store';
import {useAppDispatch} from '@/store';

/** The builder's cache key, written once. */
const planArgs = (planId: string) => ({id: planId});

export function usePlanQuery(planId: string) {
  return useGetTrainingPlanQuery(planArgs(planId));
}

/**
 * Applies `recipe` to the cached plan and returns a token whose `.undo()`
 * reverses exactly that patch.
 */
export function usePlanPatcher(planId: string) {
  const dispatch = useAppDispatch();

  return useCallback(
    (recipe: (plan: TrainingPlan) => void) =>
      dispatch(
        coachApi.util.updateQueryData('getTrainingPlan', planArgs(planId), (draft) => {
          recipe(draft.data);
        }),
      ),
    [dispatch, planId],
  );
}

/**
 * The plan as it is cached RIGHT NOW — not as a component last rendered it.
 *
 * This is what lets the set writer build every payload from one moving base
 * instead of from three components' stale props. Reading through the store
 * rather than a closure is also why the writer's callbacks are stable: they
 * close over nothing that changes.
 */
export function usePlanReader(planId: string) {
  const store = useStore<RootState>();

  return useCallback(
    () => coachApi.endpoints.getTrainingPlan.select(planArgs(planId))(store.getState()).data?.data,
    [store, planId],
  );
}

/**
 * Throws away local state and re-reads the plan from the server.
 *
 * The recovery path for a failed set write. A single set command can be the tail
 * of a coalesced chain, so undoing one patch out of order would leave the cache
 * describing a state neither the client nor the server believes in; re-reading
 * is the one move that is always correct. (Generated endpoints are `tag: false`,
 * so this can't go through `invalidateTags`.)
 */
export function usePlanRefetch(planId: string) {
  const dispatch = useAppDispatch();

  return useCallback(() => {
    dispatch(coachApi.endpoints.getTrainingPlan.initiate(planArgs(planId), {subscribe: false, forceRefetch: true}));
  }, [dispatch, planId]);
}
