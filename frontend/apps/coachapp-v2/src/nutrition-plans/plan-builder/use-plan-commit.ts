/**
 * The optimistic-write protocol for the nutrition plan cache, written once:
 * patch the cached detail, run the request, reconciling refetch on success
 * (positions and nutrition snapshots are server-computed), undo + toast on
 * failure. Mirrors the training builder's `commit`.
 *
 * Returns whether the write stuck, so callers can reset local state (a rename
 * input, a confirm dialog) when it didn't.
 */
import {useCallback} from 'react';

import {toastMutationError} from '@/@components/mutation-toast';
import {nutritionPlanKeys} from '@/api/keys';
import {type NutritionPlan, useGetNutritionPlanQuery} from '@/api/nutrition-plans-list';
import {patchQueryData} from '@/api/query-client';

/** The cached shape of `useGetNutritionPlanQuery` — every optimistic patch targets it. */
export type NutritionPlanCache = {data: NutritionPlan};

export function useNutritionPlanCommit(planId: string) {
  const {refetch} = useGetNutritionPlanQuery(planId);

  return useCallback(
    async (
      recipe: (draft: NutritionPlanCache) => void,
      run: () => Promise<unknown>,
      failMessage: string,
    ): Promise<boolean> => {
      const patch = patchQueryData<NutritionPlanCache>(nutritionPlanKeys.detail(planId), recipe);
      try {
        await run();
        refetch().catch(() => undefined);
        return true;
      } catch (error) {
        patch.undo();
        toastMutationError(error, failMessage);
        return false;
      }
    },
    [planId, refetch],
  );
}
