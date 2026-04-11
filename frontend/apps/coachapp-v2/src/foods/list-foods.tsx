import {Button, Input} from '@heroui/react';
import {ArrowLeft, Plus, Search} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import InfiniteList from '@/@components/infinite-list';
import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {useGoBack} from '@/@hooks/use-go-back';
import {useInfiniteScroll} from '@/@hooks/use-infinite-scroll';
import {type Food, type ListFoodsFilters, useFoodsInfiniteQuery} from '@/api/foods';
import FoodCard from '@/foods/components/food-card';

export default function ListFoods() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const [search, setSearch] = useState('');

  const debouncedSearch = useDebouncedValue(search);

  const queryArg: ListFoodsFilters | undefined = useMemo(() => {
    if (!debouncedSearch) return undefined;
    return {search: debouncedSearch};
  }, [debouncedSearch]);

  const {data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading} = useFoodsInfiniteQuery(queryArg);

  const foods = useMemo<Food[]>(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  const {sentinelRef} = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const isFiltering = search.length > 0;

  return (
    <PageLayout
      action={
        <Button
          onPress={() => navigate(ROUTES.CREATE_FOOD)}
          size="sm"
        >
          <Plus size={16} />
          Create
        </Button>
      }
      title="Foods"
    >
      {/* Back to library */}
      <Button
        className="mb-4"
        onPress={goBack}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft size={16} />
        Library
      </Button>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400"
            size={16}
          />
          <Input
            aria-label="Search foods"
            className="pl-9"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            type="search"
            value={search}
          />
        </div>
      </div>

      <InfiniteList
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            {isFiltering ? (
              <>
                <p className="text-sm font-medium text-foreground-500">No foods found</p>
                <p className="text-xs text-foreground-400">
                  Try adjusting your search to find what you&apos;re looking for.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground-500">No foods yet</p>
                <p className="text-xs text-foreground-400">Create your first food to get started.</p>
                <Button
                  className="mt-3"
                  onPress={() => navigate(ROUTES.CREATE_FOOD)}
                  size="sm"
                >
                  <Plus size={16} />
                  Create Food
                </Button>
              </>
            )}
          </div>
        }
        hasNextPage={hasNextPage}
        isError={isError}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        items={foods}
        keyExtractor={(food) => food.id}
        renderItem={(food) => <FoodCard food={food} />}
        sentinelRef={sentinelRef}
      />
    </PageLayout>
  );
}
