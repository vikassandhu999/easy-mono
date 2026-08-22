import {
  TRAINING_PLAN_FORM_DEFAULTS,
  type TrainingPlanFormValues,
  trainingPlanFormSchema,
  trainingPlanToUpdateRequest,
} from './training-plan-form-data.ts';

function parses(patch: Partial<TrainingPlanFormValues>) {
  return trainingPlanFormSchema.safeParse({...TRAINING_PLAN_FORM_DEFAULTS, ...patch});
}

if (parses({name: '   '}).success) {
  throw new Error('training plan name must reject whitespace-only input');
}
if (!parses({name: 'x'.repeat(255)}).success || parses({name: 'x'.repeat(256)}).success) {
  throw new Error('training plan name must enforce the API limit');
}

const trimmed = parses({name: '  Test Plan  '});
if (!trimmed.success || trimmed.data.name !== 'Test Plan') {
  throw new Error('training plan name must be normalized before submission');
}

const cleared = trainingPlanToUpdateRequest({...TRAINING_PLAN_FORM_DEFAULTS, name: 'Test Plan'}, 3);
if (cleared.description !== null) {
  throw new Error('clearing description must send null');
}
if (cleared.expected_revision !== 3) {
  throw new Error('Template metadata updates must send the observed revision');
}

console.log('training-plan-form-data: all checks passed');
