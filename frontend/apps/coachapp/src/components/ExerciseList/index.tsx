import {useMemo} from 'react';

import {Exercise, useListExercises} from '@/services/exercises';

import ExerciseCard from '../ExerciseCard';
import ListView from '../ListView';

export interface Props {
  muscleIds?: string[];
  onClick?: (id: string) => void;
  search?: string;
}

const ExerciseList = ({muscleIds, onClick, search}: Props) => {
  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListExercises({
    search,
    muscle_ids: muscleIds,
  });

  const exercises = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data?.pages]);

  return (
    <ListView<Exercise>
      emptyState={<h4 className={'text-base font-semibold'}>No Exercise Found</h4>}
      getKey={(exercise) => exercise.id}
      hasMore={hasNextPage}
      items={exercises}
      loadingMore={isFetchingNextPage}
      onLoadMore={fetchNextPage}
      querying={isLoading}
      render={(exercise) => (
        <ExerciseCard
          exercise={exercise}
          onClick={onClick}
        />
      )}
    />
  );
};

export default ExerciseList;
