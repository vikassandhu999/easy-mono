import {Button, Card, Skeleton} from '@heroui/react';
import {Plus, Search} from 'lucide-react';
import {useNavigate, useSearchParams} from 'react-router';

import LibraryControls from '@/components/LibraryControls';
import LibraryGrid from '@/components/LibraryGrid';
import {FILTER_TABS, RESOURCE_TYPE_LABEL, SORT_OPTIONS} from '@/pages/library/libraryData';
import useLibraryResources from '@/pages/library/useLibraryResources';

const CREATE_META: Record<string, {label: string; route: string}> = {
  exercise: {label: 'Add exercise', route: '/library/exercises/new'},
  food: {label: 'Add food', route: '/library/foods/new'},
  nutrition_plan: {
    label: 'Add nutrition plan',
    route: '/library/nutrition-plans/new',
  },
  recipe: {label: 'Add recipe', route: '/library/recipes/new'},
  workout_plan: {
    label: 'Add workout plan',
    route: '/library/training-plans/new',
  },
};

export default function LibraryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const filterType = FILTER_TABS.find((t) => t.value === searchParams.get('filter'))?.value ?? 'nutrition_plan';
  const sortBy = SORT_OPTIONS.find((o) => o.key === searchParams.get('sort'))?.key ?? 'recent';
  const queryParam = searchParams.get('q') ?? '';
  const activeSortLabel = SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? SORT_OPTIONS[0].label;
  const returnTo = `/library${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const sectionLabel = RESOURCE_TYPE_LABEL[filterType];
  const createMeta = CREATE_META[filterType] ?? CREATE_META.nutrition_plan;

  const {displayedResources, isError, isLoading, onRetry} = useLibraryResources(filterType, queryParam, sortBy);

  const updateParams = (fn: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    fn(next);
    setSearchParams(next, {replace: true});
  };

  const navTo = (path: string) => navigate(path, {state: {from: returnTo}});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Library</h1>
        <Button
          className="min-h-11 w-full gap-2 sm:w-auto"
          onPress={() => navTo(createMeta.route)}
          size="lg"
          variant="primary"
        >
          <Plus className="h-4 w-4" />
          <span>{createMeta.label}</span>
        </Button>
      </div>

      <LibraryControls
        activeSortLabel={activeSortLabel}
        filterType={filterType}
        onFilterChange={(v) => updateParams((p) => (v === 'nutrition_plan' ? p.delete('filter') : p.set('filter', v)))}
        onSearchCommit={(v) => updateParams((p) => (v ? p.set('q', v) : p.delete('q')))}
        onSortRotate={() => {
          const idx = SORT_OPTIONS.findIndex((o) => o.key === sortBy);
          const next = SORT_OPTIONS[idx === SORT_OPTIONS.length - 1 ? 0 : idx + 1]?.key;
          if (next) updateParams((p) => (next === 'recent' ? p.delete('sort') : p.set('sort', next)));
        }}
        searchQuery={queryParam}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{sectionLabel}</h2>
        <p className="text-sm text-muted">{displayedResources.length} total</p>
      </div>

      {isError ? (
        <Card className="border border-separator bg-surface p-6">
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-foreground">Could not load resources</p>
            <p className="text-sm text-muted">Please retry. If this continues, check API connectivity.</p>
            <Button
              className="min-h-11 self-start"
              onPress={onRetry}
              size="md"
              variant="outline"
            >
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card
              className="border border-separator bg-surface p-4"
              key={i}
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {displayedResources.length > 0 && !isLoading ? (
        <LibraryGrid
          actions={{
            onEditExercise: (ex) => navTo(`/library/exercises/${ex.id}/edit`),
            onEditFood: (food) => navTo(`/library/foods/${food.id}/edit`),
            onEditRecipe: (recipe) => navTo(`/library/recipes/${recipe.id}/edit`),
            onOpenNutritionBuilder: (plan) => navTo(`/library/nutrition-plans/${plan.id}/builder`),
            onOpenTrainingBuilder: (plan) => navTo(`/library/training-plans/${plan.id}/builder`),
          }}
          resources={displayedResources}
        />
      ) : null}

      {displayedResources.length === 0 && !isLoading ? (
        <Card className="border border-separator bg-surface p-6 sm:p-8">
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-secondary">
              <Search className="h-8 w-8 text-muted" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">
                {queryParam.trim() ? 'No results' : `No ${sectionLabel.toLowerCase()} yet`}
              </p>
              <p className="text-sm text-muted">
                {queryParam.trim()
                  ? `No ${sectionLabel.toLowerCase()} match "${queryParam.trim()}".`
                  : 'Try another filter or add a new library resource.'}
              </p>
            </div>
            {queryParam.trim() ? (
              <Button
                className="min-h-11"
                onPress={() => updateParams((p) => p.delete('q'))}
                size="md"
                variant="outline"
              >
                Clear search
              </Button>
            ) : (
              <Button
                className="min-h-11 gap-2"
                onPress={() => navTo(createMeta.route)}
                size="lg"
                variant="primary"
              >
                <Plus className="h-4 w-4" />
                <span>{createMeta.label}</span>
              </Button>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
