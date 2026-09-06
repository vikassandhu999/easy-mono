import {getStaleNutritionPlanRevision} from '../../api/nutrition-plan-lifecycle.ts';

export async function handleStaleNutritionPlanConflict(
  error: unknown,
  handlers: {
    notify: (message: string) => void;
    refetchLatest: () => Promise<unknown>;
  },
) {
  if (!getStaleNutritionPlanRevision(error)) {
    return false;
  }
  try {
    await handlers.refetchLatest();
    handlers.notify('This plan changed elsewhere. Review the latest version and try again.');
  } catch {
    handlers.notify("This plan changed elsewhere. Couldn't reload it; try again when connected.");
  }
  return true;
}
