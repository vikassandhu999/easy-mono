import {useMemo} from 'react';

import type {LibraryResource, ResourceType} from '@/features/library/libraryData';

import {useListExercisesQuery} from '@/entities/exercises/api/exercises';
import {useListFoodsQuery} from '@/entities/foods/api/foods';
import {useListNutritionPlansQuery} from '@/entities/nutritionPlans/api/nutritionPlans';
import {useListRecipesQuery} from '@/entities/recipes/api/recipes';
import {useListTrainingPlansQuery} from '@/entities/trainingPlans/api/trainingPlans';

const getResourcePopularity = (resource: LibraryResource): number => {
  switch (resource.type) {
    case 'exercise':
      return resource.data.muscles.length + resource.data.equipment.length;
    case 'food':
    case 'recipe':
      return resource.data.tags?.length ?? 0;
    case 'nutrition_plan':
      return resource.data.meals.length;
    case 'workout_plan':
      return resource.data.planned_workouts.length;
  }
};

const matchesSearch = (resource: LibraryResource, query: string): boolean => {
  if (!query) return true;
  if (resource.type === 'food' || resource.type === 'recipe') return true;

  if (resource.type === 'nutrition_plan') {
    return (
      resource.data.name.toLowerCase().includes(query) ||
      resource.data.tags.some((t) => t.toLowerCase().includes(query))
    );
  }
  if (resource.type === 'exercise') {
    return (
      resource.data.name.toLowerCase().includes(query) ||
      (resource.data.mechanics ?? '').toLowerCase().includes(query) ||
      (resource.data.force ?? '').toLowerCase().includes(query) ||
      resource.data.muscles.some((m) => m.name.toLowerCase().includes(query)) ||
      resource.data.equipment.some((e) => e.name.toLowerCase().includes(query))
    );
  }
  if (resource.type === 'workout_plan') {
    return (
      resource.data.name.toLowerCase().includes(query) ||
      (resource.data.description ?? '').toLowerCase().includes(query) ||
      resource.data.status.toLowerCase().includes(query)
    );
  }
  return true;
};

type UseLibraryResourcesResult = {
  displayedResources: LibraryResource[];
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
};

export default function useLibraryResources(
  filterType: ResourceType,
  searchValue: string,
  sortBy: string,
): UseLibraryResourcesResult {
  const shouldLoadExercises = filterType === 'exercise';
  const shouldLoadFoods = filterType === 'food';
  const shouldLoadNutritionPlans = filterType === 'nutrition_plan';
  const shouldLoadRecipes = filterType === 'recipe';
  const shouldLoadTrainingPlans = filterType === 'workout_plan';
  const searchParam = searchValue.trim() || undefined;

  const {
    data: exercisesData,
    isError: isExercisesError,
    isLoading: isExercisesLoading,
    refetch: refetchExercises,
  } = useListExercisesQuery({limit: 100, offset: 0, search: searchParam}, {skip: !shouldLoadExercises});

  const {
    data: foodsData,
    isError: isFoodsError,
    isLoading: isFoodsLoading,
    refetch: refetchFoods,
  } = useListFoodsQuery({limit: 100, offset: 0, search: searchParam}, {skip: !shouldLoadFoods});

  const {
    data: nutritionPlansData,
    isError: isNutritionPlansError,
    isLoading: isNutritionPlansLoading,
    refetch: refetchNutritionPlans,
  } = useListNutritionPlansQuery({limit: 100, offset: 0}, {skip: !shouldLoadNutritionPlans});

  const {
    data: recipesData,
    isError: isRecipesError,
    isLoading: isRecipesLoading,
    refetch: refetchRecipes,
  } = useListRecipesQuery({limit: 100, offset: 0, search: searchParam}, {skip: !shouldLoadRecipes});

  const {
    data: trainingPlansData,
    isError: isTrainingPlansError,
    isLoading: isTrainingPlansLoading,
    refetch: refetchTrainingPlans,
  } = useListTrainingPlansQuery({limit: 100, offset: 0, search: searchParam}, {skip: !shouldLoadTrainingPlans});

  const isLoading =
    (isExercisesLoading && shouldLoadExercises) ||
    (isFoodsLoading && shouldLoadFoods) ||
    (isNutritionPlansLoading && shouldLoadNutritionPlans) ||
    (isRecipesLoading && shouldLoadRecipes) ||
    (isTrainingPlansLoading && shouldLoadTrainingPlans);

  const isError =
    (isExercisesError && shouldLoadExercises) ||
    (isFoodsError && shouldLoadFoods) ||
    (isNutritionPlansError && shouldLoadNutritionPlans) ||
    (isRecipesError && shouldLoadRecipes) ||
    (isTrainingPlansError && shouldLoadTrainingPlans);

  const onRetry = () => {
    if (shouldLoadExercises) refetchExercises();
    if (shouldLoadFoods) refetchFoods();
    if (shouldLoadNutritionPlans) refetchNutritionPlans();
    if (shouldLoadRecipes) refetchRecipes();
    if (shouldLoadTrainingPlans) refetchTrainingPlans();
  };

  const normalizedQuery = searchValue.trim().toLowerCase();

  const displayedResources = useMemo(() => {
    const all: LibraryResource[] = [
      ...(nutritionPlansData?.data ?? []).map(
        (d): LibraryResource => ({
          id: `nutrition_plan-${d.id}`,
          type: 'nutrition_plan',
          data: d,
        }),
      ),
      ...(foodsData?.data ?? []).map((d): LibraryResource => ({id: `food-${d.id}`, type: 'food', data: d})),
      ...(recipesData?.data ?? []).map(
        (d): LibraryResource => ({
          id: `recipe-${d.id}`,
          type: 'recipe',
          data: d,
        }),
      ),
      ...(exercisesData?.data ?? []).map(
        (d): LibraryResource => ({
          id: `exercise-${d.id}`,
          type: 'exercise',
          data: d,
        }),
      ),
      ...(trainingPlansData?.data ?? []).map(
        (d): LibraryResource => ({
          id: `workout_plan-${d.id}`,
          type: 'workout_plan',
          data: d,
        }),
      ),
    ];

    const filtered = all.filter((r) => r.type === filterType && matchesSearch(r, normalizedQuery));

    return filtered.toSorted((a, b) => {
      if (sortBy === 'name') return a.data.name.localeCompare(b.data.name);
      if (sortBy === 'popular') return getResourcePopularity(b) - getResourcePopularity(a);
      return new Date(b.data.updated_at).getTime() - new Date(a.data.updated_at).getTime();
    });
  }, [
    exercisesData?.data,
    filterType,
    foodsData?.data,
    normalizedQuery,
    nutritionPlansData?.data,
    recipesData?.data,
    sortBy,
    trainingPlansData?.data,
  ]);

  return {displayedResources, isError, isLoading, onRetry};
}
