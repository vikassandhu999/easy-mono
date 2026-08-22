import {getStaleNutritionPlanRevision} from '../../api/nutrition-plan-lifecycle.ts';

export function staleNutritionPlanConflictMessage(currentRevision: number) {
  return `This plan changed elsewhere (revision ${currentRevision}). I reloaded the latest version — review it and reapply your edit.`;
}

export async function handleStaleNutritionPlanConflict<T>(
  error: unknown,
  handlers: {
    notify: (message: string) => void;
    refetchLatest: () => Promise<T | undefined> | T | undefined;
    replaceWithLatest?: (latest: T) => void;
  },
) {
  const currentRevision = getStaleNutritionPlanRevision(error);
  if (!currentRevision) {
    return false;
  }

  const latest = await handlers.refetchLatest();
  if (latest) {
    handlers.replaceWithLatest?.(latest);
  }
  handlers.notify(staleNutritionPlanConflictMessage(currentRevision));
  return true;
}
