import {useMemo, useState} from 'react';

import {Exercise, useListExercises} from '@/services/exercises';

import ExerciseCard from '../ExerciseCard';
import ListView from '../ListView';
import MuscleFilter from './MuscleFilter';

export interface Props {
  onExerciseClick?: (id: string) => void;
  search?: string;
}

const ExerciseList = ({onExerciseClick, search}: Props) => {
  const [muscleIds, setMuscleIds] = useState<string[]>([]);

  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListExercises({
    search,
    muscle_ids: muscleIds,
  });

  const exercises = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data?.pages]);

  return (
    <div className={'flex flex-col gap-4'}>
      <MuscleFilter
        muscleIds={muscleIds}
        onMuscleIdsChange={setMuscleIds}
      />
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
            onClick={onExerciseClick}
          />
        )}
      />
    </div>
  );
};

export default ExerciseList;
