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
import {type ListRecipesFilters, type Recipe, useRecipesInfiniteQuery} from '@/api/recipes';
import RecipeCard from '@/recipes/components/recipe-card';

export default function ListRecipes() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const [search, setSearch] = useState('');

  const debouncedSearch = useDebouncedValue(search);

  const queryArg: ListRecipesFilters | undefined = useMemo(() => {
    if (!debouncedSearch) return undefined;
    return {search: debouncedSearch};
  }, [debouncedSearch]);

  const {data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading} = useRecipesInfiniteQuery(queryArg);

  const recipes = useMemo<Recipe[]>(() => {
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
          onPress={() => navigate(ROUTES.CREATE_RECIPE)}
          size="sm"
        >
          <Plus size={16} />
          Create
        </Button>
      }
      title="Recipes"
    >
      <Button
        className="mb-4"
        onPress={goBack}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft size={16} />
        Library
      </Button>

      <div className="mb-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400"
            size={16}
          />
          <Input
            aria-label="Search recipes"
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
                <p className="text-sm font-medium text-foreground-500">No recipes found</p>
                <p className="text-xs text-foreground-400">
                  Try adjusting your search to find what you&apos;re looking for.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground-500">No recipes yet</p>
                <p className="text-xs text-foreground-400">Create your first recipe to get started.</p>
                <Button
                  className="mt-3"
                  onPress={() => navigate(ROUTES.CREATE_RECIPE)}
                  size="sm"
                >
                  <Plus size={16} />
                  Create Recipe
                </Button>
              </>
            )}
          </div>
        }
        hasNextPage={hasNextPage}
        isError={isError}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        items={recipes}
        keyExtractor={(recipe) => recipe.id}
        renderItem={(recipe) => <RecipeCard recipe={recipe} />}
        sentinelRef={sentinelRef}
      />
    </PageLayout>
  );
}
