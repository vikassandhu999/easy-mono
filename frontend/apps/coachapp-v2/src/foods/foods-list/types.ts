import type {Food} from '@/api/foods';

export type FoodsListFilters = {
  search: string;
};

export type FoodsListQueryResult = {
  fetchNextPage: () => void;
  foods: Food[];
  isLoading: boolean;
};
