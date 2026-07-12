import {useDeferredValue, useState} from 'react';

import ListEmptyState from '@/@components/list-empty-state';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useCoachRecipesInfiniteQuery} from '@/api/nutrition-foods';
import SectionPage from '@/library/components/section-page';
import {recipeItem} from '@/library/lib/builder-items';

export default function ListRecipes() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const list = useCoachRecipesInfiniteQuery({search: deferredSearch});
  const {fetchNextPage, isError, isLoading, isFetchingNextPage, items, refetch} = useInfiniteItems(list);

  return (
    <SectionPage
      count={list.data?.pages[0]?.count}
      emptyState={
        <ListEmptyState
          createLabel="Create Recipe"
          createRoute={ROUTES.CREATE_RECIPE}
          emptyDescription="Create your first recipe to get started."
          hasFilter={!!deferredSearch}
          nounPlural="recipes"
        />
      }
      fetchNextPage={fetchNextPage}
      hasNextPage={list.hasNextPage}
      isError={isError}
      isFetchingNextPage={isFetchingNextPage}
      isLoading={isLoading}
      items={items.map(recipeItem)}
      onRetry={refetch}
      onSearchChange={setSearch}
      search={search}
      typeKey="recipes"
    />
  );
}
