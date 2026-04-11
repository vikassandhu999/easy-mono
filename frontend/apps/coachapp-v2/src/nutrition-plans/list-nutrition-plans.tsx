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
import {type ListNutritionPlansFilters, type NutritionPlan, useNutritionPlansInfiniteQuery} from '@/api/nutritionPlans';
import NutritionPlanCard from '@/nutrition-plans/components/nutrition-plan-card';

export default function ListNutritionPlans() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const [search, setSearch] = useState('');

  const debouncedSearch = useDebouncedValue(search);

  const queryArg: ListNutritionPlansFilters | undefined = useMemo(() => {
    if (!debouncedSearch) return undefined;
    return {search: debouncedSearch};
  }, [debouncedSearch]);

  const {data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading} =
    useNutritionPlansInfiniteQuery(queryArg);

  // Only show templates (plans not assigned to a client) in the library listing
  const plans = useMemo<NutritionPlan[]>(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data).filter((plan) => plan.client_id === null);
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
          onPress={() => navigate(ROUTES.CREATE_NUTRITION_PLAN)}
          size="sm"
        >
          <Plus size={16} />
          Create
        </Button>
      }
      title="Nutrition Plans"
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
            aria-label="Search nutrition plans"
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
                <p className="text-sm font-medium text-foreground-500">No nutrition plans found</p>
                <p className="text-xs text-foreground-400">
                  Try adjusting your search to find what you&apos;re looking for.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground-500">No nutrition plans yet</p>
                <p className="text-xs text-foreground-400">Create your first nutrition plan to get started.</p>
                <Button
                  className="mt-3"
                  onPress={() => navigate(ROUTES.CREATE_NUTRITION_PLAN)}
                  size="sm"
                >
                  <Plus size={16} />
                  Create Nutrition Plan
                </Button>
              </>
            )}
          </div>
        }
        hasNextPage={hasNextPage}
        isError={isError}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        items={plans}
        keyExtractor={(plan) => plan.id}
        renderItem={(plan) => <NutritionPlanCard plan={plan} />}
        sentinelRef={sentinelRef}
      />
    </PageLayout>
  );
}
