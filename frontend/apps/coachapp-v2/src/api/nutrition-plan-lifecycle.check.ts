import {
  clientPlanLifecycleLabel,
  getStaleNutritionPlanRevision,
  nutritionPlanAssignmentRequest,
  nutritionPlanDeleteRequest,
  nutritionPlanRevisionRequest,
} from './nutrition-plan-lifecycle.ts';

const lifecycleLabels = {
  incomplete: 'Incomplete',
  upcoming: 'Upcoming',
  current: 'Current',
  ended: 'Ended',
  archived: 'Archived',
} as const;

for (const [lifecycle, expected] of Object.entries(lifecycleLabels)) {
  if (clientPlanLifecycleLabel(lifecycle as keyof typeof lifecycleLabels) !== expected) {
    throw new Error(`${lifecycle} Client Plans must use the generated lifecycle label`);
  }
}

const plan = {id: 'plan-1', revision: 7};

if (JSON.stringify(nutritionPlanRevisionRequest(plan)) !== JSON.stringify({expected_revision: 7})) {
  throw new Error('archive and restore commands must send the observed revision');
}

if (JSON.stringify(nutritionPlanDeleteRequest(plan)) !== JSON.stringify({id: 'plan-1', expectedRevision: 7})) {
  throw new Error('delete commands must send the plan id and observed revision');
}

if (
  JSON.stringify(
    nutritionPlanAssignmentRequest({
      body: {expected_revision: 7, end_date: '2026-09-30', start_date: '2026-09-01'},
      clientId: 'client-1',
      id: 'template-1',
    }),
  ) !==
  JSON.stringify({
    params: {path: {client_id: 'client-1', id: 'template-1'}},
    body: {expected_revision: 7, end_date: '2026-09-30', start_date: '2026-09-01'},
  })
) {
  throw new Error('assignment must map the visible client, template, dates, and observed source revision');
}

if (
  getStaleNutritionPlanRevision({
    data: {
      error_code: 'stale_revision',
      error_detail: {current_revision: 8},
    },
  }) !== 8
) {
  throw new Error('stale revision responses must expose the current server revision');
}

if (getStaleNutritionPlanRevision({data: {error_code: 'invalid_input'}}) !== null) {
  throw new Error('non-stale API errors must not be treated as revision conflicts');
}

if (
  getStaleNutritionPlanRevision({
    data: {error_code: 'stale_revision', error_detail: {current_revision: '8'}},
  }) !== null
) {
  throw new Error('malformed revision conflict details must be rejected');
}

console.log('nutrition-plan-lifecycle checks passed');
