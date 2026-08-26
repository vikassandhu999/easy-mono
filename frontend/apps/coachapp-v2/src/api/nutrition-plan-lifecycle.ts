import type {NutritionPlan, NutritionPlanAssign, NutritionPlanUpdate} from './schema.ts';
import {parseApiError} from './shared.ts';

export type ClientPlanLifecycle = Exclude<NutritionPlan['lifecycle'], null>;

const CLIENT_PLAN_LIFECYCLE_LABELS: Record<ClientPlanLifecycle, string> = {
  archived: 'Archived',
  current: 'Current',
  ended: 'Ended',
  incomplete: 'Incomplete',
  upcoming: 'Upcoming',
};

export function clientPlanLifecycleLabel(lifecycle: ClientPlanLifecycle): string {
  return CLIENT_PLAN_LIFECYCLE_LABELS[lifecycle];
}

type RevisionedNutritionPlan = {
  id: string;
  revision: number;
};

export function nutritionPlanRevisionRequest(plan: RevisionedNutritionPlan) {
  return {expected_revision: plan.revision};
}

export function nutritionPlanDeleteRequest(plan: RevisionedNutritionPlan) {
  return {id: plan.id, expectedRevision: plan.revision};
}

type NutritionPlanAssignRequest = NutritionPlanAssign;
type NutritionPlanUpdateRequest = NutritionPlanUpdate;

type Assignment = {
  body: NutritionPlanAssignRequest;
  clientId: string;
  id: string;
};

export function nutritionPlanAssignmentRequest({body, clientId, id}: Assignment) {
  return {
    params: {path: {client_id: clientId, id}},
    body,
  } as const;
}

export function nutritionPlanPeriodRequest(
  plan: RevisionedNutritionPlan,
  period: Pick<NutritionPlanUpdateRequest, 'end_date' | 'start_date'>,
): NutritionPlanUpdateRequest {
  return {...period, expected_revision: plan.revision};
}

export function getStaleNutritionPlanRevision(error: unknown): null | number {
  const body = parseApiError(error);
  if (body?.error_code !== 'stale_revision') {
    return null;
  }

  const revision = body.error_detail?.current_revision;
  return typeof revision === 'number' && Number.isInteger(revision) && revision > 0 ? revision : null;
}
