import type {ReactNode} from 'react';

import {useMemo} from 'react';

import {type TrainingPlan, useTrainingPlansInfiniteQuery} from '@/api/trainingPlans';

import type {TrainingPlansListFilters, TrainingPlansListQueryResult} from './types';

type Props = TrainingPlansListFilters & {
  children: (result: TrainingPlansListQueryResult) => ReactNode;
};

export default function TrainingPlansListQuery({children, search}: Props) {
  const list = useTrainingPlansInfiniteQuery({search});

  const plans = useMemo<TrainingPlan[]>(() => {
    return list.data?.pages.flatMap((page) => page.data) ?? [];
  }, [list.data]);

  return children({
    fetchNextPage: list.fetchNextPage,
    isLoading: list.isLoading,
    plans,
  });
}
