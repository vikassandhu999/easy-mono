import type {Recipe} from '@/api/recipes';

export type RecipesListFilters = {
  search: string;
};

export type RecipesListQueryResult = {
  fetchNextPage: () => void;
  isLoading: boolean;
  recipes: Recipe[];
};
