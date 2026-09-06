import {ApiError} from '@easy/utils/api-error';
import {clientPlanLifecycleLabel, getStaleNutritionPlanRevision} from '../../src/api/nutrition-plan-lifecycle.ts';

/** Every query and mutation rejects with `ApiError` — nothing else reaches these helpers. */
const apiError = (data: unknown) => new ApiError(409, data);

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

if (
  getStaleNutritionPlanRevision(apiError({error_code: 'stale_revision', error_detail: {current_revision: 8}})) !== 8
) {
  throw new Error('stale revision responses must expose the current server revision');
}

if (getStaleNutritionPlanRevision(apiError({error_code: 'invalid_input'})) !== null) {
  throw new Error('non-stale API errors must not be treated as revision conflicts');
}

if (
  getStaleNutritionPlanRevision(apiError({error_code: 'stale_revision', error_detail: {current_revision: '8'}})) !==
  null
) {
  throw new Error('malformed revision conflict details must be rejected');
}

if (
  getStaleNutritionPlanRevision({data: {error_code: 'stale_revision', error_detail: {current_revision: 8}}}) !== null
) {
  throw new Error('a bare object that only looks like an ApiError must not be trusted');
}

console.log('nutrition-plan-lifecycle checks passed');
