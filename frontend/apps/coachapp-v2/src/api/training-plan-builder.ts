/**
 * The training builder's data layer — the ONLY module that names the builder's
 * cache entry or writes to it. Everything above works in plan-shaped values and
 * never imports `queryClient` or a query key directly.
 *
 * One entry, one key: `trainingPlanKeys.detail(planId)`. `getTrainingPlan`
 * already returns the whole tree: workouts, their elements, each element's
 * exercise (with `tracking_type`), the planned sets, and the weekday schedule
 * as `plan_items` — server-ordered by `TrainingWorkout.oldest()` and
 * `TrainingWorkoutExercise.by_position()`. The builder used to fetch
 * `listWorkouts` and `getTrainingPlanSchedule` on top of it, which put the
 * literal `{planId, limit: 100}` at nine hand-written call sites. Query keys
 * are compared by VALUE, so changing that limit would have pointed every
 * optimistic write at an entry nobody reads — silently, with no type error.
 * There is now no second key left to get wrong.
 *
 * This file also owns every mutation the builder writes through directly:
 * workouts, the weekday schedule, and workout elements (exercises + their
 * planned sets). All of them are invalidation-free by design — the builder
 * patches `trainingPlanKeys.detail(planId)` itself via `usePlanPatcher`
 * before the request even lands (see `use-plan-builder.ts` /
 * `use-set-writer.ts`), and invalidating here too would just cause a
 * redundant refetch that could clobber an in-flight optimistic edit or a
 * still-debouncing set write. Plan-level CRUD that ISN'T part of that
 * optimistic protocol — create/update/assign/duplicate/delete/list — lives in
 * `src/api/training-plans-list.ts` instead, since it invalidates normally.
 */

import {useMutation, useQuery} from '@tanstack/react-query';
import {useCallback} from 'react';

import {call, client} from '@/api/client';
import {trainingPlanKeys} from '@/api/keys';
import {patchQueryData, queryClient} from '@/api/query-client';
import type {components} from '@/api/schema';

export type TrainingPlan = components['schemas']['TrainingPlan'];
export type TrainingPlanWorkout = components['schemas']['TrainingPlanWorkout'];
export type TrainingPlanWorkoutExercise = components['schemas']['TrainingPlanWorkoutExercise'];
export type TrainingPlanItem = components['schemas']['TrainingPlanItem'];
export type TrainingPlanPlannedSet = components['schemas']['TrainingPlanPlannedSet'];

type TrainingPlanResponse = components['schemas']['TrainingPlanResponse'];
type TrainingWorkoutRequest = components['schemas']['TrainingWorkoutRequest'];
type TrainingWorkoutUpdateRequest = components['schemas']['TrainingWorkoutUpdateRequest'];
type TrainingWorkoutResponse = components['schemas']['TrainingWorkoutResponse'];
type TrainingDayScheduleRequest = components['schemas']['TrainingDayScheduleRequest'];
type TrainingWorkoutExerciseRequest = components['schemas']['TrainingWorkoutExerciseRequest'];
type TrainingWorkoutExerciseResponse = components['schemas']['TrainingWorkoutExerciseResponse'];
type TrainingWorkoutReorderRequest = components['schemas']['TrainingWorkoutReorderRequest'];
type TrainingWorkoutExerciseArrayResponse = components['schemas']['TrainingWorkoutExerciseArrayResponse'];

/**
 * General-purpose fetch for one training plan. `usePlanQuery` below is just
 * this under the builder's name — kept as a separate export because
 * non-builder screens (plan create/edit, the ⋯ menu) read and patch the same
 * entry without pulling in the rest of the builder's vocabulary.
 *
 * MUST key on `trainingPlanKeys.detail(id)` — every optimistic patch in this
 * file targets that exact key, so a different key here would silently split
 * the cache in two.
 */
export function useGetTrainingPlanQuery(planId: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: trainingPlanKeys.detail(planId),
    queryFn: () =>
      call(
        client.GET('/v1/coach/training-plans/{id}', {params: {path: {id: planId}}}),
      ) as Promise<TrainingPlanResponse>,
    enabled: options?.enabled ?? true,
  });
}

export function usePlanQuery(planId: string) {
  return useGetTrainingPlanQuery(planId);
}

/**
 * Applies `recipe` to the cached plan and returns a token whose `.undo()`
 * reverses exactly that patch.
 */
export function usePlanPatcher(planId: string) {
  return useCallback(
    (recipe: (plan: TrainingPlan) => void) =>
      patchQueryData<TrainingPlanResponse>(trainingPlanKeys.detail(planId), (draft) => {
        recipe(draft.data);
      }),
    [planId],
  );
}

/**
 * The plan as it is cached RIGHT NOW — not as a component last rendered it.
 *
 * This is what lets the set writer build every payload from one moving base
 * instead of from three components' stale props. Reading through the query
 * cache rather than a closure is also why the writer's callbacks are stable:
 * they close over nothing that changes.
 */
export function usePlanReader(planId: string) {
  return useCallback(
    () => queryClient.getQueryData<TrainingPlanResponse>(trainingPlanKeys.detail(planId))?.data,
    [planId],
  );
}

/**
 * Throws away local state and re-reads the plan from the server.
 *
 * The recovery path for a failed set write. A single set command can be the
 * tail of a coalesced chain, so undoing one patch out of order would leave
 * the cache describing a state neither the client nor the server believes
 * in; re-reading is the one move that is always correct. (These mutations
 * are invalidation-free by design, so this can't go through
 * `invalidateQueries` — it has to force a real refetch.)
 */
export function usePlanRefetch(planId: string) {
  return useCallback(() => {
    queryClient.refetchQueries({queryKey: trainingPlanKeys.detail(planId)});
  }, [planId]);
}

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------

export function useCreateWorkoutMutation() {
  return useMutation({
    mutationFn: ({planId, body}: {planId: string; body: TrainingWorkoutRequest}) =>
      call(
        client.POST('/v1/coach/training-plans/{plan_id}/training-workouts', {
          params: {path: {plan_id: planId}},
          body,
        }),
      ) as Promise<TrainingWorkoutResponse>,
  });
}

export function useUpdateWorkoutMutation() {
  return useMutation({
    mutationFn: ({id, body}: {id: string; body: TrainingWorkoutUpdateRequest}) =>
      call(
        client.PATCH('/v1/coach/training-workouts/{id}', {params: {path: {id}}, body}),
      ) as Promise<TrainingWorkoutResponse>,
  });
}

export function useDeleteWorkoutMutation() {
  return useMutation({
    mutationFn: (id: string) => call(client.DELETE('/v1/coach/training-workouts/{id}', {params: {path: {id}}})),
  });
}

// ---------------------------------------------------------------------------
// Weekly schedule
// ---------------------------------------------------------------------------

export function useSetTrainingPlanDayScheduleMutation() {
  return useMutation({
    mutationFn: ({planId, day, body}: {planId: string; day: string; body: TrainingDayScheduleRequest}) =>
      call(
        client.PUT('/v1/coach/training-plans/{plan_id}/schedule/{day}', {
          params: {path: {plan_id: planId, day}},
          body,
        }),
      ),
  });
}

// ---------------------------------------------------------------------------
// Workout elements (exercises + their planned sets)
// ---------------------------------------------------------------------------

export function useCreateWorkoutElementMutation() {
  return useMutation({
    mutationFn: ({workoutId, body}: {workoutId: string; body: TrainingWorkoutExerciseRequest}) =>
      call(
        client.POST('/v1/coach/training-workouts/{workout_id}/exercises', {
          params: {path: {workout_id: workoutId}},
          body,
        }),
      ) as Promise<TrainingWorkoutExerciseResponse>,
  });
}

export function useUpdateWorkoutElementMutation() {
  return useMutation({
    mutationFn: ({id, body}: {id: string; body: TrainingWorkoutExerciseRequest}) =>
      call(
        client.PATCH('/v1/coach/training-workout-exercises/{id}', {params: {path: {id}}, body}),
      ) as Promise<TrainingWorkoutExerciseResponse>,
  });
}

export function useDeleteWorkoutElementMutation() {
  return useMutation({
    mutationFn: (id: string) =>
      call(client.DELETE('/v1/coach/training-workout-exercises/{id}', {params: {path: {id}}})),
  });
}

export function useReorderWorkoutElementsMutation() {
  return useMutation({
    mutationFn: ({workoutId, body}: {workoutId: string; body: TrainingWorkoutReorderRequest}) =>
      call(
        client.PUT('/v1/coach/training-workouts/{workout_id}/exercises/reorder', {
          params: {path: {workout_id: workoutId}},
          body,
        }),
      ) as Promise<TrainingWorkoutExerciseArrayResponse>,
  });
}
