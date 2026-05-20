import React, {PropsWithChildren, RefCallback, useCallback, useContext, useMemo, useRef} from 'react';

import {TrainingPlan} from '@/api/trainingPlans';

type Value = {
  plan: TrainingPlan;
  useWorkoutRef: (workoutId: string) => RefCallback<HTMLElement>;
  scrollToWorkout: (id: string) => void;
};
const Context = React.createContext<Value>({} as any);

type Props = PropsWithChildren & {
  plan: TrainingPlan;
};

export default function BuilderProvider({children, plan}: Props) {
  const refs = useRef<{workoutId: string; instance: HTMLElement}[]>([]);

  const useWorkoutRef = useCallback((workoutId: string) => {
    let prev: HTMLElement | null;
    return (instance: HTMLElement | null) => {
      if (instance == null) {
        if (prev) {
          refs.current = refs.current.filter((v) => v.workoutId !== workoutId);
        }
        prev = null;
        return;
      }
      prev = instance;
      const val = refs.current.find((v) => v.workoutId === workoutId);
      if (val) {
        val.instance = instance;
      } else {
        refs.current.push({workoutId, instance});
      }
    };
  }, []);

  const scrollToWorkout = useCallback((workoutId: string) => {
    const val = refs.current.find((v) => v.workoutId === workoutId);
    val?.instance.scrollIntoView({behavior: 'smooth', block: 'center'});
  }, []);

  const value = useMemo(
    () => ({
      useWorkoutRef,
      scrollToWorkout,
      plan,
    }),
    [useWorkoutRef, scrollToWorkout, plan],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useBuilder = () => {
  const value = useContext(Context);
  if (!value) {
    throw new Error('useBuilder must be used insite BuilderProvider');
  }
  return value;
};
