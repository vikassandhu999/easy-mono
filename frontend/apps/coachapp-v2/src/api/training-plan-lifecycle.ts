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
