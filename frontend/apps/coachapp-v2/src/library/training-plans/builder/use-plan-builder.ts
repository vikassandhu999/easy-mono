/**
 * React's only jobs here: hand the screen one commands object per plan,
 * re-render when the two visible pending flags flip, and flush debounced
 * edits on unmount. What the commands DO lives in `commands.ts`, which has no
 * hooks — see there for the write protocols.
 */
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useSearchParams} from 'react-router-dom';

import type {TrainingPlanWorkout} from '@/api/training-plans';

import {createPlanCommands} from '@/library/training-plans/builder/commands';

export function usePlanBuilder(planId: string) {
  const [isAddingWorkout, setAddingWorkout] = useState(false);
  const [isRemovingWorkout, setRemovingWorkout] = useState(false);

  const {flush, ...commands} = useMemo(
    () =>
      createPlanCommands(planId, (key, busy) => {
        (key === 'addWorkout' ? setAddingWorkout : setRemovingWorkout)(busy);
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

  return {...commands, isAddingWorkout, isRemovingWorkout};
}

export type PlanBuilderCommands = ReturnType<typeof usePlanBuilder>;

/**
 * Which workout the builder is showing. It lives in the URL so a refresh, a
 * deep link and browser Back all land on the same workout; `replace` keeps tab
 * switching out of the history stack.
 */
export function useActiveWorkout(workouts: TrainingPlanWorkout[]) {
  const [params, setParams] = useSearchParams();
  const active = workouts.find((workout) => workout.id === params.get('w')) ?? workouts[0];

  const select = useCallback(
    (workoutId: string) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('w', workoutId);
          return next;
        },
        {replace: true},
      );
    },
    [setParams],
  );

  return [active, select] as const;
}
