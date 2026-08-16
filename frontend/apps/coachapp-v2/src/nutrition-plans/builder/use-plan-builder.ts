/**
 * React's only jobs here: hand the screen one commands object per plan,
 * re-render when the two visible pending flags flip, and flush debounced
 * edits on unmount. What the commands DO lives in `commands.ts`, which has no
 * hooks — see there for the write protocols.
 */
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useSearchParams} from 'react-router-dom';

import type {NutritionPlanDay} from '@/api/nutrition-plan-builder';

import {createPlanCommands} from './commands';

export function usePlanBuilder(planId: string) {
  const [isAddingDay, setAddingDay] = useState(false);
  const [isRemovingDay, setRemovingDay] = useState(false);

  const {flush, ...commands} = useMemo(
    () =>
      createPlanCommands(planId, (key, busy) => {
        (key === 'addDay' ? setAddingDay : setRemovingDay)(busy);
      }),
    [planId],
  );

  // Leaving the screen must not drop a debounced edit.
  useEffect(
    () => () => {
      flush().catch(() => undefined);
    },
    [flush],
  );

  return {...commands, isAddingDay, isRemovingDay};
}

export type PlanBuilderCommands = ReturnType<typeof usePlanBuilder>;

/**
 * Which day the builder is showing. It lives in the URL so a refresh, a deep
 * link and browser Back all land on the same day; `replace` keeps tab
 * switching out of the history stack. A stale `?d=` — after deleting the day
 * it named — falls through to the first day; that fallback is the only
 * correction needed, and it self-heals on the next tab press.
 */
export function useActiveDay(days: NutritionPlanDay[]) {
  const [params, setParams] = useSearchParams();
  const active = days.find((day) => day.id === params.get('d')) ?? days[0];

  const select = useCallback(
    (dayId: string) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('d', dayId);
          return next;
        },
        {replace: true},
      );
    },
    [setParams],
  );

  return [active, select] as const;
}
