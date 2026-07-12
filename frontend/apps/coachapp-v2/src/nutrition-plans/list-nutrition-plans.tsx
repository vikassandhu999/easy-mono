import {useDeferredValue, useState} from 'react';

import ListEmptyState from '@/@components/list-empty-state';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useCoachNutritionPlansInfiniteQuery} from '@/api/nutrition-plans-list';
import SectionPage from '@/library/components/section-page';
import {nutritionPlanItem} from '@/library/lib/builder-items';

export default function ListNutritionPlans() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const list = useCoachNutritionPlansInfiniteQuery({search: deferredSearch});
  const {fetchNextPage, isError, isLoading, isFetchingNextPage, items, refetch} = useInfiniteItems(list);

  return (
    <SectionPage
      count={list.data?.pages[0]?.count}
      emptyState={
        <ListEmptyState
          createLabel="Create Nutrition Plan"
          createRoute={ROUTES.CREATE_NUTRITION_PLAN}
          emptyDescription="Create your first nutrition plan to get started."
          hasFilter={!!deferredSearch}
          nounPlural="nutrition plans"
        />
      }
      fetchNextPage={fetchNextPage}
      hasNextPage={list.hasNextPage}
      isError={isError}
      isFetchingNextPage={isFetchingNextPage}
      isLoading={isLoading}
      items={items.map(nutritionPlanItem)}
      onRetry={refetch}
      onSearchChange={setSearch}
      search={search}
      typeKey="nutrition"
    />
  );
}
