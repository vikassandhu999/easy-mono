import type {ReactNode} from 'react';

import {useMemo} from 'react';

import {type Exercise, useExercisesInfiniteQuery} from '@/api/exercises';

import type {ExercisesListFilters, ExercisesListQueryResult} from './types';

type Props = ExercisesListFilters & {
  children: (result: ExercisesListQueryResult) => ReactNode;
};

export default function ExercisesListQuery({children, muscleIds, search}: Props) {
  const list = useExercisesInfiniteQuery({
    muscle_ids: muscleIds,
    search,
  });

  const exercises = useMemo<Exercise[]>(() => {
    return list.data?.pages.flatMap((page) => page.data) ?? [];
  }, [list.data]);

  return children({
    exercises,
    fetchNextPage: list.fetchNextPage,
    isLoading: list.isLoading,
  });
}
