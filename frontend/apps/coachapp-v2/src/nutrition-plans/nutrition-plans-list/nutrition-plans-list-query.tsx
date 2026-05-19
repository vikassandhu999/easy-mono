import type {ReactNode} from 'react';

import {useMemo} from 'react';

import {type NutritionPlan, useNutritionPlansInfiniteQuery} from '@/api/nutritionPlans';

import type {NutritionPlansListFilters, NutritionPlansListQueryResult} from './types';

type Props = NutritionPlansListFilters & {
  children: (result: NutritionPlansListQueryResult) => ReactNode;
};

export default function NutritionPlansListQuery({children, search}: Props) {
  const list = useNutritionPlansInfiniteQuery({search});

  const plans = useMemo<NutritionPlan[]>(() => {
    return list.data?.pages.flatMap((page) => page.data) ?? [];
  }, [list.data]);

  return children({
    fetchNextPage: list.fetchNextPage,
    isLoading: list.isLoading,
    plans,
  });
}
