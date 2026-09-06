import type {NutritionPlan} from './schema.ts';
import {parseApiError} from './shared.ts';

export type ClientPlanLifecycle = Exclude<NutritionPlan['lifecycle'], null>;

const CLIENT_PLAN_LIFECYCLE_LABELS: Record<ClientPlanLifecycle, string> = {
  active: 'Active',
  archived: 'Archived',
  current: 'Current',
  ended: 'Ended',
  incomplete: 'Incomplete',
  upcoming: 'Upcoming',
};

export function clientPlanLifecycleLabel(lifecycle: ClientPlanLifecycle): string {
  return CLIENT_PLAN_LIFECYCLE_LABELS[lifecycle];
}

export function getStaleNutritionPlanRevision(error: unknown): null | number {
  const body = parseApiError(error);
  if (body?.error_code !== 'stale_revision') {
    return null;
  }

  const revision = body.error_detail?.current_revision;
  return typeof revision === 'number' && Number.isInteger(revision) && revision > 0 ? revision : null;
}
