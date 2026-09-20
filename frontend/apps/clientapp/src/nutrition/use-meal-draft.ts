import {useDurableDraft} from '../ui/use-durable-draft';
import {type MealDraft, parseMealDraft} from './meal-draft';

export function useMealDraft(initial: MealDraft) {
  return useDurableDraft({
    initial,
    resource: `nutrition.${initial.date}.${initial.slot}`,
    parse: (raw) => parseMealDraft(raw, initial.date, initial.slot),
    label: 'meal',
  });
}
