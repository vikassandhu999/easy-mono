import {useDeferredValue, useState} from 'react';

import ListEmptyState from '@/@components/list-empty-state';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useCoachFoodsInfiniteQuery} from '@/api/nutrition-foods';
import SectionPage from '@/library/components/section-page';
import {foodItem} from '@/library/lib/builder-items';

export default function ListFoods() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const list = useCoachFoodsInfiniteQuery({search: deferredSearch});
  const {fetchNextPage, isError, isLoading, isFetchingNextPage, items, refetch} = useInfiniteItems(list);

  return (
    <SectionPage
      count={list.data?.pages[0]?.count}
      emptyState={
        <ListEmptyState
          createLabel="Create Food"
          createRoute={ROUTES.CREATE_FOOD}
          emptyDescription="Create your first food to get started."
          hasFilter={!!deferredSearch}
          nounPlural="foods"
        />
      }
      fetchNextPage={fetchNextPage}
      hasNextPage={list.hasNextPage}
      isError={isError}
      isFetchingNextPage={isFetchingNextPage}
      isLoading={isLoading}
      items={items.map(foodItem)}
      onRetry={refetch}
      onSearchChange={setSearch}
      search={search}
      typeKey="foods"
    />
  );
}
