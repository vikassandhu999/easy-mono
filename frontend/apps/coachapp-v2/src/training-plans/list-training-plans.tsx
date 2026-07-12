import {useDeferredValue, useState} from 'react';

import ListEmptyState from '@/@components/list-empty-state';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useCoachTrainingPlansInfiniteQuery} from '@/api/training-plans-list';
import SectionPage from '@/library/components/section-page';
import {trainingPlanItem} from '@/library/lib/builder-items';

export default function ListTrainingPlans() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const list = useCoachTrainingPlansInfiniteQuery({search: deferredSearch});
  const {fetchNextPage, isError, isLoading, isFetchingNextPage, items, refetch} = useInfiniteItems(list);

  return (
    <SectionPage
      count={list.data?.pages[0]?.count}
      emptyState={
        <ListEmptyState
          createLabel="Create Training Plan"
          createRoute={ROUTES.CREATE_TRAINING_PLAN}
          emptyDescription="Create your first training plan to get started."
          hasFilter={!!deferredSearch}
          nounPlural="training plans"
        />
      }
      fetchNextPage={fetchNextPage}
      hasNextPage={list.hasNextPage}
      isError={isError}
      isFetchingNextPage={isFetchingNextPage}
      isLoading={isLoading}
      items={items.map(trainingPlanItem)}
      onRetry={refetch}
      onSearchChange={setSearch}
      search={search}
      typeKey="training"
    />
  );
}
