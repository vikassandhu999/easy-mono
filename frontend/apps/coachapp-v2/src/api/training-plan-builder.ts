/**
 * The training builder's data layer — the ONLY module that names the builder's
 * cache entry or touches it. Everything above works in plan-shaped values and
 * never imports `queryClient` or a query key directly.
 *
 * One entry, one key: `trainingPlanKeys.detail(planId)`. `getTrainingPlan`
 * returns the whole tree — workouts, their elements, each element's exercise
 * (with `tracking_type`), the planned sets, and the weekday schedule as one
 * Mon..Sun map — server-ordered, so the builder needs no second query and
 * there is no second key to get wrong.
 *
 * The read is a React Query hook; everything else here is a PLAIN FUNCTION.
 * The builder's writes are optimistic and invalidation-free by design — the
 * command layer patches the cache itself and reconciles from replies (see
 * `builder/commands.ts`) — so `useMutation` would contribute nothing here:
 * its `onSuccess` invalidation is deliberately unused, retry is off
 * app-wide, `isPending` is tracked by the two commands that surface it, and
 * its per-render result objects are exactly the footgun RM-142 exists for. A
 * write layer with no hooks can't re-grow that bug, and plain functions need
 * no dependency arrays to keep honest. (`patchPlan`/`readPlan`/`refetchPlan`
 * are plain for the same reason — `queryClient` is a module singleton, and
 * wrapping module state in hooks only manufactures identities.)
 *
 * Plan-level CRUD that ISN'T part of the optimistic protocol —
 * create/update/assign/duplicate/delete/list — lives in
 * `src/api/training-plans-list.ts` instead, since it invalidates normally.
 * `updatePlanPeriod` is the one hybrid: the builder edits an assigned plan's
 * dates optimistically, but list rows show them, so it re-runs the same
 * invalidations `useUpdateTrainingPlanMutation` would.
 */

import {useQuery} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {clientKeys, trainingPlanKeys} from '@/api/keys';
import {patchQueryData, queryClient} from '@/api/query-client';
import type {components} from '@/api/schema';

export type TrainingPlan = components['schemas']['TrainingPlan'];
export type TrainingPlanWorkout = components['schemas']['TrainingPlanWorkout'];
export type TrainingPlanWorkoutExercise = components['schemas']['TrainingPlanWorkoutExercise'];
export type TrainingSchedule = components['schemas']['TrainingSchedule'];
export type TrainingPlanPlannedSet = components['schemas']['TrainingPlanPlannedSet'];

type TrainingPlanResponse = components['schemas']['TrainingPlanResponse'];
type TrainingPlanUpdateRequest = components['schemas']['TrainingPlanUpdateRequest'];
type TrainingWorkoutRequest = components['schemas']['TrainingWorkoutRequest'];
type TrainingWorkoutUpdateRequest = components['schemas']['TrainingWorkoutUpdateRequest'];
type TrainingWorkoutResponse = components['schemas']['TrainingWorkoutResponse'];
type TrainingScheduleResponse = components['schemas']['TrainingScheduleResponse'];
type TrainingWorkoutExerciseRequest = components['schemas']['TrainingWorkoutExerciseRequest'];
type TrainingWorkoutExercisesCreateRequest = components['schemas']['TrainingWorkoutExercisesCreateRequest'];
type TrainingWorkoutExerciseResponse = components['schemas']['TrainingWorkoutExerciseResponse'];
type TrainingWorkoutExerciseArrayResponse = components['schemas']['TrainingWorkoutExerciseArrayResponse'];

/**
 * General-purpose fetch for one training plan.
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

// ---------------------------------------------------------------------------
// The cached plan
// ---------------------------------------------------------------------------

/**
 * Applies `recipe` to the cached plan and returns a token whose `.undo()`
 * reverses exactly that patch.
 */
export function patchPlan(planId: string, recipe: (plan: TrainingPlan) => void) {
  return patchQueryData<TrainingPlanResponse>(trainingPlanKeys.detail(planId), (draft) => {
    recipe(draft.data);
  });
}

/**
 * The plan as it is cached RIGHT NOW — not as a component last rendered it.
 * Commands build payloads from this so two quick edits compose instead of the
 * second one being computed off a stale prop.
 */
export function readPlan(planId: string): TrainingPlan | undefined {
  return queryClient.getQueryData<TrainingPlanResponse>(trainingPlanKeys.detail(planId))?.data;
}

/**
 * Throws away local state and re-reads the plan from the server — the
 * recovery move for a failed coalesced write, where undoing one patch out of
 * order would leave the cache describing a state neither side believes in.
 * (Builder writes are invalidation-free, so this can't go through
 * `invalidateQueries` — it has to force a real refetch.)
 */
export function refetchPlan(planId: string) {
  queryClient.refetchQueries({queryKey: trainingPlanKeys.detail(planId)});
}

// ---------------------------------------------------------------------------
// Requests — thin, unwrapped, no cache effects
// ---------------------------------------------------------------------------

export async function createWorkout(planId: string, body: TrainingWorkoutRequest): Promise<TrainingPlanWorkout> {
  const response = (await call(
    client.POST('/v1/coach/training-plans/{plan_id}/training-workouts', {
      params: {path: {plan_id: planId}},
      body,
    }),
  )) as TrainingWorkoutResponse;
  return response.data;
}

export async function updateWorkout(id: string, body: TrainingWorkoutUpdateRequest): Promise<TrainingPlanWorkout> {
  const response = (await call(
    client.PATCH('/v1/coach/training-workouts/{id}', {params: {path: {id}}, body}),
  )) as TrainingWorkoutResponse;
  return response.data;
}

export async function deleteWorkout(id: string): Promise<void> {
  await call(client.DELETE('/v1/coach/training-workouts/{id}', {params: {path: {id}}}));
}

/** Full Mon..Sun map — the server replaces the plan's whole schedule with it. */
export async function replaceSchedule(planId: string, schedule: TrainingSchedule): Promise<TrainingSchedule> {
  const response = (await call(
    client.PUT('/v1/coach/training-plans/{plan_id}/schedule', {
      params: {path: {plan_id: planId}},
      body: schedule,
    }),
  )) as TrainingScheduleResponse;
  return response.data;
}

/** Batch create — one transaction, elements land in the order given. */
export async function createElements(
  workoutId: string,
  body: TrainingWorkoutExercisesCreateRequest,
): Promise<TrainingPlanWorkoutExercise[]> {
  const response = (await call(
    client.POST('/v1/coach/training-workouts/{workout_id}/exercises', {
      params: {path: {workout_id: workoutId}},
      body,
    }),
  )) as TrainingWorkoutExerciseArrayResponse;
  return response.data;
}

export async function updateElement(
  id: string,
  body: TrainingWorkoutExerciseRequest,
): Promise<TrainingPlanWorkoutExercise> {
  const response = (await call(
    client.PATCH('/v1/coach/training-workout-exercises/{id}', {params: {path: {id}}, body}),
  )) as TrainingWorkoutExerciseResponse;
  return response.data;
}

export async function deleteElement(id: string): Promise<void> {
  await call(client.DELETE('/v1/coach/training-workout-exercises/{id}', {params: {path: {id}}}));
}

export async function reorderElements(workoutId: string, elementIds: string[]): Promise<TrainingPlanWorkoutExercise[]> {
  const response = (await call(
    client.PUT('/v1/coach/training-workouts/{workout_id}/exercises/reorder', {
      params: {path: {workout_id: workoutId}},
      body: {element_ids: elementIds},
    }),
  )) as TrainingWorkoutExerciseArrayResponse;
  return response.data;
}

/**
 * The one builder write with cache effects beyond the detail entry: assigned
 * plans' dates show on list rows and client cards, so this mirrors
 * `useUpdateTrainingPlanMutation`'s invalidations (detail included — the
 * refetch confirms the optimistic patch, same as the screens' flow).
 */
export async function updatePlanPeriod(planId: string, body: TrainingPlanUpdateRequest): Promise<void> {
  await call(client.PATCH('/v1/coach/training-plans/{id}', {params: {path: {id: planId}}, body}));
  queryClient.invalidateQueries({queryKey: trainingPlanKeys.detail(planId)});
  queryClient.invalidateQueries({queryKey: trainingPlanKeys.lists()});
  queryClient.invalidateQueries({queryKey: trainingPlanKeys.forClients()});
  queryClient.invalidateQueries({queryKey: clientKeys.lists()});
  queryClient.invalidateQueries({queryKey: clientKeys.details()});
}
