import type {NutritionPlan} from '@/api/nutritionPlans';

export type NutritionPlansListFilters = {
  search: string;
};

export type NutritionPlansListQueryResult = {
  fetchNextPage: () => void;
  isLoading: boolean;
  plans: NutritionPlan[];
};
