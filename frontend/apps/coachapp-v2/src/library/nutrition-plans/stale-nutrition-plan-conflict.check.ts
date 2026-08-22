import {ApiError} from '../../api/api-error.ts';
import {handleStaleNutritionPlanConflict, staleNutritionPlanConflictMessage} from './stale-nutrition-plan-conflict.ts';

const staleError = new ApiError(409, {error_code: 'stale_revision', error_detail: {current_revision: 12}});

const events: string[] = [];
const handled = await handleStaleNutritionPlanConflict(staleError, {
  refetchLatest: async () => {
    events.push('refetch');
    return {name: 'Server version'};
  },
  replaceWithLatest: (latest) => {
    events.push(`replace:${latest.name}`);
  },
  notify: (message) => {
    events.push(`notify:${message}`);
  },
});

if (!handled) {
  throw new Error('stale revision conflicts must be handled');
}

if (
  JSON.stringify(events) !==
  JSON.stringify(['refetch', 'replace:Server version', `notify:${staleNutritionPlanConflictMessage(12)}`])
) {
  throw new Error('stale revision handling must refetch, apply server state, then ask the coach to reapply');
}

if (!staleNutritionPlanConflictMessage(12).includes('reapply')) {
  throw new Error('stale revision message must ask the coach to reapply instead of implying an auto-merge');
}

const nonStaleEvents: string[] = [];
const nonStaleHandled = await handleStaleNutritionPlanConflict(new ApiError(422, {error_code: 'invalid_input'}), {
  refetchLatest: () => {
    nonStaleEvents.push('refetch');
    return undefined;
  },
  notify: () => {
    nonStaleEvents.push('notify');
  },
});

if (nonStaleHandled || nonStaleEvents.length > 0) {
  throw new Error('non-stale errors must stay on their existing error paths');
}

console.log('stale-nutrition-plan-conflict checks passed');
