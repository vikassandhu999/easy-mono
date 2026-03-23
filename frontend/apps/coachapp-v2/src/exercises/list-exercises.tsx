import {Button, Input} from '@heroui/react';
import {ArrowLeft, Plus, Search} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import InfiniteList from '@/@components/infinite-list';
import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {useInfiniteScroll} from '@/@hooks/use-infinite-scroll';
import {type Exercise, type ListExercisesFilters, useExercisesInfiniteQuery} from '@/api/exercises';
import ExerciseCard from '@/exercises/components/exercise-card';

export default function ListExercises() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const debouncedSearch = useDebouncedValue(search);

  const queryArg: ListExercisesFilters | undefined = useMemo(() => {
    if (!debouncedSearch) return undefined;
    return {search: debouncedSearch};
  }, [debouncedSearch]);

  const {data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading} =
    useExercisesInfiniteQuery(queryArg);

  const exercises = useMemo<Exercise[]>(() => {
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
          onPress={() => navigate(ROUTES.CREATE_EXERCISE)}
          size="sm"
        >
          <Plus size={16} />
          Create
        </Button>
      }
      title="Exercises"
    >
      {/* Back to library */}
      <Button
        className="mb-4"
        onPress={() => navigate(ROUTES.LIBRARY)}
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
            aria-label="Search exercises"
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
                <p className="text-sm font-medium text-foreground-500">No exercises found</p>
                <p className="text-xs text-foreground-400">
                  Try adjusting your search to find what you&apos;re looking for.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground-500">No exercises yet</p>
                <p className="text-xs text-foreground-400">Create your first exercise to get started.</p>
                <Button
                  className="mt-3"
                  onPress={() => navigate(ROUTES.CREATE_EXERCISE)}
                  size="sm"
                >
                  <Plus size={16} />
                  Create Exercise
                </Button>
              </>
            )}
          </div>
        }
        hasNextPage={hasNextPage}
        isError={isError}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        items={exercises}
        keyExtractor={(exercise) => exercise.id}
        renderItem={(exercise) => <ExerciseCard exercise={exercise} />}
        sentinelRef={sentinelRef}
      />
    </PageLayout>
  );
}
