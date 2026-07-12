import {useDeferredValue, useState} from 'react';

import ListEmptyState from '@/@components/list-empty-state';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useListMusclesQuery} from '@/api/generated';
import {useCoachTrainingExercisesInfiniteQuery} from '@/api/training-exercises';
import SectionPage, {filterChip} from '@/library/components/section-page';
import {exerciseItem} from '@/library/lib/builder-items';

export default function ListExercises() {
  const [search, setSearch] = useState('');
  const [muscleId, setMuscleId] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(search);
  const list = useCoachTrainingExercisesInfiniteQuery({
    muscleIds: muscleId ? [muscleId] : [],
    search: deferredSearch,
  });
  const {fetchNextPage, isError, isLoading, isFetchingNextPage, items, refetch} = useInfiniteItems(list);

  const {data: musclesData} = useListMusclesQuery({});
  const muscles = musclesData?.data ?? [];

  return (
    <SectionPage
      count={list.data?.pages[0]?.count}
      emptyState={
        <ListEmptyState
          createLabel="Create exercise"
          createRoute={ROUTES.CREATE_EXERCISE}
          emptyDescription="Create your first exercise to get started."
          filterDescription="Try adjusting your search or filters to find what you're looking for."
          hasFilter={!!deferredSearch || muscleId != null}
          nounPlural="exercises"
        />
      }
      fetchNextPage={fetchNextPage}
      filters={
        muscles.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              className={filterChip(muscleId == null)}
              onClick={() => setMuscleId(null)}
              type="button"
            >
              All
            </button>
            {muscles.map((muscle) => (
              <button
                className={filterChip(muscleId === muscle.id)}
                key={muscle.id}
                onClick={() => setMuscleId(muscleId === muscle.id ? null : muscle.id)}
                type="button"
              >
                {muscle.name}
              </button>
            ))}
          </div>
        ) : null
      }
      hasNextPage={list.hasNextPage}
      isError={isError}
      isFetchingNextPage={isFetchingNextPage}
      isLoading={isLoading}
      items={items.map(exerciseItem)}
      onRetry={refetch}
      onSearchChange={setSearch}
      search={search}
      typeKey="exercises"
    />
  );
}
