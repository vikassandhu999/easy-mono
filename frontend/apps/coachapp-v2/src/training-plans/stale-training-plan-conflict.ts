import {getStaleTrainingPlanRevision} from '../api/training-plan-lifecycle.ts';

export function staleTrainingPlanConflictMessage(currentRevision: number) {
  return `This plan changed elsewhere (revision ${currentRevision}). I reloaded the latest version — review it and reapply your edit.`;
}

export async function handleStaleTrainingPlanConflict<T>(
  error: unknown,
  handlers: {
    notify: (message: string) => void;
    refetchLatest: () => Promise<T | undefined> | T | undefined;
    replaceWithLatest?: (latest: T) => void;
  },
) {
  const currentRevision = getStaleTrainingPlanRevision(error);
  if (!currentRevision) {
    return false;
  }

  const latest = await handlers.refetchLatest();
  if (latest) {
    handlers.replaceWithLatest?.(latest);
  }
  handlers.notify(staleTrainingPlanConflictMessage(currentRevision));
  return true;
}
