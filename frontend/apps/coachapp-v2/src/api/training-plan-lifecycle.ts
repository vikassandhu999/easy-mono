import {parseApiErrorBody} from '@easy/utils/parse-api-error';
import {ApiError} from './api-error.ts';
import type {components} from './schema.ts';

// --- training-plan-lifecycle ---

export type ClientPlanLifecycle = components['schemas']['CoachClientTrainingPlan']['lifecycle'];

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

type RevisionedTrainingPlan = {
  id: string;
  revision: number;
};

export function trainingPlanRevisionRequest(plan: RevisionedTrainingPlan) {
  return {expected_revision: plan.revision};
}

export function trainingPlanDeleteRequest(plan: RevisionedTrainingPlan) {
  return {id: plan.id, expectedRevision: plan.revision};
}

export function getStaleTrainingPlanRevision(error: unknown): null | number {
  if (!(error instanceof ApiError)) {
    return null;
  }

  const body = parseApiErrorBody(error.data);
  if (!body || body.error_code !== 'stale_revision') {
    return null;
  }

  const detail = body.error_detail;
  if (!detail || typeof detail !== 'object' || !('current_revision' in detail)) {
    return null;
  }

  const revision = detail.current_revision;
  return typeof revision === 'number' && Number.isInteger(revision) && revision > 0 ? revision : null;
}

// --- training-plan-requests ---

type TrainingPlanAssignRequest = components['schemas']['TrainingPlanAssignRequest'];
type TrainingPlanUpdateRequest = components['schemas']['TrainingPlanUpdateRequest'];

type Assignment = {
  body: TrainingPlanAssignRequest;
  clientId: string;
  id: string;
};

type RevisionedPlan = {
  revision: number;
};

export function trainingPlanAssignmentRequest({body, clientId, id}: Assignment) {
  return {
    params: {path: {client_id: clientId, id}},
    body,
  } as const;
}

export function trainingPlanPeriodRequest(
  plan: RevisionedPlan,
  period: Pick<TrainingPlanUpdateRequest, 'end_date' | 'start_date'>,
): TrainingPlanUpdateRequest {
  return {...period, expected_revision: plan.revision};
}
