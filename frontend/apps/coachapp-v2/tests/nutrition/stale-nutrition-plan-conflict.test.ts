import assert from 'node:assert/strict';
import {ApiError} from '@easy/utils/api-error';
import {handleStaleNutritionPlanConflict} from '../../src/library/nutrition-plans/stale-nutrition-plan-conflict.ts';

const stale = new ApiError(409, {error_code: 'stale_revision', error_detail: {current_revision: 12}});
const messages: string[] = [];
assert.equal(
  await handleStaleNutritionPlanConflict(stale, {
    refetchLatest: async () => {
      throw new Error('Offline');
    },
    notify: (message) => messages.push(message),
  }),
  true,
);
assert.match(messages[0] ?? '', /Couldn't reload/);
assert.equal(
  await handleStaleNutritionPlanConflict(stale, {
    refetchLatest: async () => ({}),
    notify: (message) => messages.push(message),
  }),
  true,
);
assert.match(messages[1] ?? '', /Review the latest/);
assert.equal(
  await handleStaleNutritionPlanConflict(new ApiError(422, {}), {
    refetchLatest: async () => {
      throw new Error('Should not reload');
    },
    notify: () => {
      throw new Error('Should not notify');
    },
  }),
  false,
);
