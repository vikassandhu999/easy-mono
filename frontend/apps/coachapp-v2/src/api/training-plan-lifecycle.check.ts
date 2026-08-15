import {
  getStaleTrainingPlanRevision,
  trainingPlanDeleteRequest,
  trainingPlanRevisionRequest,
} from './training-plan-lifecycle.ts';

const plan = {id: 'plan-1', revision: 7};

if (JSON.stringify(trainingPlanRevisionRequest(plan)) !== JSON.stringify({expected_revision: 7})) {
  throw new Error('archive and restore commands must send the observed revision');
}

if (JSON.stringify(trainingPlanDeleteRequest(plan)) !== JSON.stringify({id: 'plan-1', expectedRevision: 7})) {
  throw new Error('delete commands must send the plan id and observed revision');
}

if (
  getStaleTrainingPlanRevision({
    data: {
      error_code: 'stale_revision',
      error_detail: {current_revision: 8},
    },
  }) !== 8
) {
  throw new Error('stale revision responses must expose the current server revision');
}

if (getStaleTrainingPlanRevision({data: {error_code: 'invalid_input'}}) !== null) {
  throw new Error('non-stale API errors must not be treated as revision conflicts');
}

if (
  getStaleTrainingPlanRevision({
    data: {error_code: 'stale_revision', error_detail: {current_revision: '8'}},
  }) !== null
) {
  throw new Error('malformed revision conflict details must be rejected');
}

console.log('training-plan-lifecycle checks passed');
