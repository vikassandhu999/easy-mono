import type {components} from './schema.ts';

export type ClientPlanLifecycle = Exclude<components['schemas']['NutritionPlan']['lifecycle'], null>;

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

export function getStaleNutritionPlanRevision(error: unknown): null | number {
  if (!error || typeof error !== 'object' || !('data' in error)) {
    return null;
  }

  const data = (error as {data?: unknown}).data;
  if (!data || typeof data !== 'object' || !('error_code' in data) || data.error_code !== 'stale_revision') {
    return null;
  }

  const detail = 'error_detail' in data ? data.error_detail : null;
  if (!detail || typeof detail !== 'object' || !('current_revision' in detail)) {
    return null;
  }

  const revision = detail.current_revision;
  return typeof revision === 'number' && Number.isInteger(revision) && revision > 0 ? revision : null;
}
