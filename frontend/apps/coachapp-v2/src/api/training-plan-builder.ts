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
 * The read is a React Query hook; writes are plain functions. Every structural
 * save sends the whole authoritative Prescription through one revisioned
 * operation, and the command layer serializes those saves and reconciles the
 * complete response into this same cache entry.
 *
 * Plan-level CRUD that is not part of Prescription replacement —
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
import {trainingPlanPeriodRequest} from '@/api/training-plan-requests';
import {planToPrescriptionRequest} from '@/api/training-prescription';
import {workbenchMutationTargets} from '@/api/workbench-targets';

export type TrainingPlan = components['schemas']['TrainingPlan'];
export type TrainingPlanWorkout = components['schemas']['TrainingPlanWorkout'];
export type TrainingPlanWorkoutExercise = components['schemas']['TrainingPlanWorkoutExercise'];
export type TrainingSchedule = components['schemas']['TrainingSchedule'];
export type TrainingPlanPlannedSet = components['schemas']['TrainingPlanPlannedSet'];

type TrainingPlanResponse = components['schemas']['TrainingPlanResponse'];
type TrainingPlanUpdateRequest = components['schemas']['TrainingPlanUpdateRequest'];

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
    queryFn: () => call(client.GET('/v1/coach/training-plans/{id}', {params: {path: {id: planId}}})),
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

export async function refetchTrainingPlan(planId: string): Promise<TrainingPlan | undefined> {
  await queryClient.refetchQueries({queryKey: trainingPlanKeys.detail(planId), type: 'active'});
  return readPlan(planId);
}

// ---------------------------------------------------------------------------
// Complete Prescription replacement
// ---------------------------------------------------------------------------

export async function replacePrescription(planId: string, plan: TrainingPlan): Promise<TrainingPlan> {
  const response = (await call(
    client.PUT('/v1/coach/training-plans/{id}/prescription', {
      params: {path: {id: planId}},
      body: planToPrescriptionRequest(plan),
    }),
  )) as TrainingPlanResponse;
  return response.data;
}

/**
 * The one builder write with cache effects beyond the detail entry: assigned
 * plans' dates show on list rows and client cards, so this mirrors
 * `useUpdateTrainingPlanMutation`'s invalidations (detail included — the
 * refetch confirms the optimistic patch, same as the screens' flow).
 */
export async function updatePlanPeriod(
  planId: string,
  body: Pick<TrainingPlanUpdateRequest, 'end_date' | 'start_date'>,
): Promise<TrainingPlan> {
  const plan = readPlan(planId);
  if (!plan) {
    throw new Error('Cannot update Client Plan Coverage before the plan is loaded');
  }

  const response = (await call(
    client.PATCH('/v1/coach/training-plans/{id}', {
      params: {path: {id: planId}},
      body: trainingPlanPeriodRequest(plan, body),
    }),
  )) as TrainingPlanResponse;
  queryClient.invalidateQueries({queryKey: trainingPlanKeys.detail(planId)});
  queryClient.invalidateQueries({queryKey: trainingPlanKeys.lists()});
  queryClient.invalidateQueries({queryKey: trainingPlanKeys.forClients()});
  queryClient.invalidateQueries({queryKey: clientKeys.lists()});
  queryClient.invalidateQueries({queryKey: clientKeys.details()});
  for (const queryKey of workbenchMutationTargets().afterMembershipChange) {
    queryClient.invalidateQueries({queryKey: [...queryKey]});
  }
  return response.data;
}
