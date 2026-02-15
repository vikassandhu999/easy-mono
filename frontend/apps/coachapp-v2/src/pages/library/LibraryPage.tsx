import {Button, Card, Input, Skeleton, toast} from '@heroui/react';
import {ArrowUpDown, Plus, Search} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router';

import type {NutritionPlan} from '@/api/nutritionPlans';
import type {LibraryResource} from '@/pages/library/libraryData';

import {useListFoodsQuery} from '@/api/foods';
import {useListNutritionPlansQuery} from '@/api/nutritionPlans';
import {useListRecipesQuery} from '@/api/recipes';
import AssignNutritionPlanModal from '@/pages/library/AssignNutritionPlanModal';
import ExerciseCard from '@/pages/library/ExerciseCard';
import FoodCard from '@/pages/library/FoodCard';
import {FILTER_TABS, LIBRARY_RESOURCES, RESOURCE_TYPE_LABEL, SORT_OPTIONS} from '@/pages/library/libraryData';
import NutritionPlanCard from '@/pages/library/NutritionPlanCard';
import RecipeCard from '@/pages/library/RecipeCard';
import WorkoutPlanCard from '@/pages/library/WorkoutPlanCard';

const CREATE_ACTION_LABEL: Record<(typeof FILTER_TABS)[number]['value'], string> = {
  exercise: 'Add exercise',
  food: 'Add food',
  nutrition_plan: 'Add nutrition plan',
  recipe: 'Add recipe',
  workout_plan: 'Add workout plan',
};

export default function LibraryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [assignPlan, setAssignPlan] = useState<null | NutritionPlan>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const filterParam = searchParams.get('filter');
  const queryParam = searchParams.get('q') ?? '';
  const sortParam = searchParams.get('sort');
  const filterType = FILTER_TABS.find((tab) => tab.value === filterParam)?.value ?? 'nutrition_plan';
  const sortBy = SORT_OPTIONS.find((option) => option.key === sortParam)?.key ?? 'recent';
  const [searchInput, setSearchInput] = useState(queryParam);
  const returnTo = `/library${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const shouldLoadFoods = filterType === 'food';
  const shouldLoadNutritionPlans = filterType === 'nutrition_plan';
  const shouldLoadRecipes = filterType === 'recipe';
  const searchValue = queryParam.trim();
  const normalizedQuery = queryParam.trim().toLowerCase();
  const hasSearchQuery = normalizedQuery.length > 0;

  useEffect(() => {
    setSearchInput(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      if (searchInput === queryParam) {
        return;
      }

      const nextParams = new URLSearchParams(searchParams);
      if (searchInput.trim()) {
        nextParams.set('q', searchInput);
      } else {
        nextParams.delete('q');
      }
      setSearchParams(nextParams, {replace: true});
    }, 250);

    return () => {
      window.clearTimeout(debounceTimer);
    };
  }, [queryParam, searchInput, searchParams, setSearchParams]);

  const {
    data: foodsData,
    isError: isFoodsError,
    isLoading: isFoodsLoading,
    refetch: refetchFoods,
  } = useListFoodsQuery(
    {
      limit: 100,
      offset: 0,
      search: searchValue || undefined,
    },
    {
      skip: !shouldLoadFoods,
    },
  );

  const {
    data: nutritionPlansData,
    isError: isNutritionPlansError,
    isLoading: isNutritionPlansLoading,
    refetch: refetchNutritionPlans,
  } = useListNutritionPlansQuery(
    {
      limit: 100,
      offset: 0,
    },
    {
      skip: !shouldLoadNutritionPlans,
    },
  );

  const {
    data: recipesData,
    isError: isRecipesError,
    isLoading: isRecipesLoading,
    refetch: refetchRecipes,
  } = useListRecipesQuery(
    {
      limit: 100,
      offset: 0,
      search: searchValue || undefined,
    },
    {
      skip: !shouldLoadRecipes,
    },
  );

  const activeSortLabel = SORT_OPTIONS.find((option) => option.key === sortBy)?.label ?? SORT_OPTIONS[0].label;

  const handleRotateSort = () => {
    const currentIndex = SORT_OPTIONS.findIndex((option) => option.key === sortBy);
    const nextIndex = currentIndex === SORT_OPTIONS.length - 1 ? 0 : currentIndex + 1;
    const nextOption = SORT_OPTIONS[nextIndex];

    if (nextOption) {
      const nextParams = new URLSearchParams(searchParams);
      if (nextOption.key === 'recent') {
        nextParams.delete('sort');
      } else {
        nextParams.set('sort', nextOption.key);
      }
      setSearchParams(nextParams, {replace: true});
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
  };

  const clearSearch = () => {
    setSearchInput('');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    setSearchParams(nextParams, {replace: true});
  };

  const displayedResources = useMemo(() => {
    const nutritionPlanResources: LibraryResource[] = (nutritionPlansData?.data ?? []).map((nutritionPlan) => ({
      id: `nutrition_plan-${nutritionPlan.id}`,
      type: 'nutrition_plan',
      data: nutritionPlan,
    }));

    const foodResources: LibraryResource[] = (foodsData?.data ?? []).map((food) => ({
      id: `food-${food.id}`,
      type: 'food',
      data: food,
    }));

    const recipeResources: LibraryResource[] = (recipesData?.data ?? []).map((recipe) => ({
      id: `recipe-${recipe.id}`,
      type: 'recipe',
      data: recipe,
    }));

    const sourceResources = [...LIBRARY_RESOURCES, ...nutritionPlanResources, ...foodResources, ...recipeResources];

    const filtered = sourceResources.filter((resource) => {
      return resource.type === filterType;
    });

    const searched = filtered.filter((resource) => {
      if (!normalizedQuery) {
        return true;
      }

      if (resource.type === 'food') {
        return true;
      }

      if (resource.type === 'recipe') {
        return true;
      }

      if (resource.type === 'nutrition_plan') {
        const planName = resource.data.name.toLowerCase();
        const tagsMatch = resource.data.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));
        return planName.includes(normalizedQuery) || tagsMatch;
      }

      return resource.title.toLowerCase().includes(normalizedQuery);
    });

    return [...searched].sort((left, right) => {
      if (sortBy === 'name') {
        const leftName =
          left.type === 'food'
            ? left.data.name
            : left.type === 'recipe'
              ? left.data.name
              : left.type === 'nutrition_plan'
                ? left.data.name
                : left.title;
        const rightName =
          right.type === 'food'
            ? right.data.name
            : right.type === 'recipe'
              ? right.data.name
              : right.type === 'nutrition_plan'
                ? right.data.name
                : right.title;
        return leftName.localeCompare(rightName);
      }

      if (sortBy === 'popular') {
        const leftCount =
          left.type === 'food' || left.type === 'recipe'
            ? (left.data.tags?.length ?? 0)
            : left.type === 'nutrition_plan'
              ? left.data.meals.length
              : left.usageCount;
        const rightCount =
          right.type === 'food' || right.type === 'recipe'
            ? (right.data.tags?.length ?? 0)
            : right.type === 'nutrition_plan'
              ? right.data.meals.length
              : right.usageCount;
        return rightCount - leftCount;
      }

      const leftDate =
        left.type === 'food' || left.type === 'recipe'
          ? left.data.updated_at
          : left.type === 'nutrition_plan'
            ? left.data.updated_at
            : left.updatedAt;
      const rightDate =
        right.type === 'food' || right.type === 'recipe'
          ? right.data.updated_at
          : right.type === 'nutrition_plan'
            ? right.data.updated_at
            : right.updatedAt;
      return new Date(rightDate).getTime() - new Date(leftDate).getTime();
    });
  }, [filterType, foodsData?.data, normalizedQuery, nutritionPlansData?.data, recipesData?.data, sortBy]);

  const sectionLabel = RESOURCE_TYPE_LABEL[filterType];
  const isResourceLoading =
    (isNutritionPlansLoading && shouldLoadNutritionPlans) ||
    (isFoodsLoading && shouldLoadFoods) ||
    (isRecipesLoading && shouldLoadRecipes);
  const isResourceError =
    (isNutritionPlansError && shouldLoadNutritionPlans) ||
    (isFoodsError && shouldLoadFoods) ||
    (isRecipesError && shouldLoadRecipes);

  const openPrimaryCreate = () => {
    if (filterType === 'nutrition_plan') {
      navigate('/library/nutrition-plans/new', {state: {from: returnTo}});
      return;
    }
    if (filterType === 'food') {
      navigate('/library/foods/new', {state: {from: returnTo}});
      return;
    }
    if (filterType === 'recipe') {
      navigate('/library/recipes/new', {state: {from: returnTo}});
      return;
    }
    toast.danger(`${RESOURCE_TYPE_LABEL[filterType]} creation is coming soon. Use Foods or Recipes for now.`);
  };

  const primaryActionLabel = CREATE_ACTION_LABEL[filterType];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">Manage</p>
          <h1 className="text-2xl font-semibold md:text-3xl">Library</h1>
          <p className="max-w-2xl text-sm text-muted">
            Manage reusable nutrition and training resources for faster client programming.
          </p>
        </div>

        <Button
          className="min-h-11 w-full gap-2 sm:w-auto"
          onPress={openPrimaryCreate}
          size="lg"
          variant="primary"
        >
          <Plus className="h-4 w-4" />
          <span>{primaryActionLabel}</span>
        </Button>
      </div>

      <div className="flex min-w-0 flex-col gap-3 border-b border-separator pb-3">
        <div className="scrollbar-hide flex min-w-0 items-center gap-2 overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const isActive = tab.value === filterType;

            return (
              <Button
                className="min-h-11 shrink-0"
                key={tab.value}
                onPress={() => {
                  const nextParams = new URLSearchParams(searchParams);
                  if (tab.value === 'nutrition_plan') {
                    nextParams.delete('filter');
                  } else {
                    nextParams.set('filter', tab.value);
                  }
                  setSearchParams(nextParams, {replace: true});
                }}
                size="md"
                variant={isActive ? 'secondary' : 'ghost'}
              >
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </Button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            aria-label={`Search ${sectionLabel.toLowerCase()}`}
            className="min-h-11 w-full sm:max-w-sm"
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder={`Search ${sectionLabel.toLowerCase()}`}
            type="search"
            value={searchInput}
            variant="secondary"
          />

          <Button
            className="min-h-11 w-full justify-start gap-2 sm:w-auto sm:justify-center"
            onPress={handleRotateSort}
            size="md"
            variant="outline"
          >
            <ArrowUpDown className="h-4 w-4" />
            <span>Sort: {activeSortLabel}</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{sectionLabel}</h2>
        <p className="text-sm text-muted">{displayedResources.length} total</p>
      </div>

      {isResourceError ? (
        <Card className="border border-separator bg-surface p-6">
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-foreground">Could not load resources</p>
            <p className="text-sm text-muted">Please retry. If this continues, check API connectivity.</p>
            <div className="flex gap-2">
              {shouldLoadNutritionPlans ? (
                <Button
                  className="min-h-11"
                  onPress={() => refetchNutritionPlans()}
                  size="md"
                  variant="outline"
                >
                  Retry Nutrition Plans
                </Button>
              ) : null}
              {shouldLoadFoods ? (
                <Button
                  className="min-h-11"
                  onPress={() => refetchFoods()}
                  size="md"
                  variant="outline"
                >
                  Retry Foods
                </Button>
              ) : null}
              {shouldLoadRecipes ? (
                <Button
                  className="min-h-11"
                  onPress={() => refetchRecipes()}
                  size="md"
                  variant="outline"
                >
                  Retry Recipes
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      {isResourceLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <Card
              className="border border-separator bg-surface p-4"
              key={index}
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

      {displayedResources.length > 0 && !isResourceLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedResources.map((resource) => {
            if (resource.type === 'food') {
              return (
                <FoodCard
                  food={resource.data}
                  key={resource.id}
                  onEdit={(food) => {
                    navigate(`/library/foods/${food.id}/edit`, {
                      state: {from: returnTo},
                    });
                  }}
                />
              );
            }
            if (resource.type === 'recipe') {
              return (
                <RecipeCard
                  key={resource.id}
                  onEdit={(recipe) => {
                    navigate(`/library/recipes/${recipe.id}/edit`, {
                      state: {from: returnTo},
                    });
                  }}
                  recipe={resource.data}
                />
              );
            }
            if (resource.type === 'nutrition_plan') {
              return (
                <NutritionPlanCard
                  key={resource.id}
                  onAssign={(plan) => {
                    setAssignPlan(plan);
                    setIsAssignOpen(true);
                  }}
                  onOpenBuilder={(plan) => {
                    navigate(`/library/nutrition-plans/${plan.id}/builder`, {
                      state: {from: returnTo},
                    });
                  }}
                  resource={resource.data}
                />
              );
            }
            if (resource.type === 'workout_plan') {
              return (
                <WorkoutPlanCard
                  key={resource.id}
                  resource={resource}
                />
              );
            }
            return (
              <ExerciseCard
                key={resource.id}
                resource={resource}
              />
            );
          })}
        </div>
      ) : null}

      {displayedResources.length === 0 && !isResourceLoading ? (
        <Card className="border border-separator bg-surface p-6 sm:p-8">
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-secondary">
              <Search className="h-8 w-8 text-muted" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">{hasSearchQuery ? 'No results' : 'No resources found'}</p>
              <p className="text-sm text-muted">
                {hasSearchQuery
                  ? `No ${sectionLabel.toLowerCase()} match "${queryParam.trim()}".`
                  : 'Try another filter or add a new library resource.'}
              </p>
            </div>
            {hasSearchQuery ? (
              <Button
                className="min-h-11"
                onPress={clearSearch}
                size="md"
                variant="outline"
              >
                Clear search
              </Button>
            ) : (
              <Button
                className="min-h-11 gap-2"
                onPress={openPrimaryCreate}
                size="lg"
                variant="primary"
              >
                <Plus className="h-4 w-4" />
                <span>{primaryActionLabel}</span>
              </Button>
            )}
          </div>
        </Card>
      ) : null}

      <AssignNutritionPlanModal
        isOpen={isAssignOpen}
        onAssigned={(assignedPlanId) => {
          navigate(`/library/nutrition-plans/${assignedPlanId}/builder`, {
            state: {from: returnTo},
          });
        }}
        onOpenChange={(open) => {
          setIsAssignOpen(open);
          if (!open) {
            setAssignPlan(null);
          }
        }}
        plan={assignPlan}
      />
    </div>
  );
}
