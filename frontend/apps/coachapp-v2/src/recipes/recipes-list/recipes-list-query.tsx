import type {ReactNode} from 'react';

import {useMemo} from 'react';

import {type Recipe, useRecipesInfiniteQuery} from '@/api/recipes';

import type {RecipesListFilters, RecipesListQueryResult} from './types';

type Props = RecipesListFilters & {
  children: (result: RecipesListQueryResult) => ReactNode;
};

export default function RecipesListQuery({children, search}: Props) {
  const list = useRecipesInfiniteQuery({search});

  const recipes = useMemo<Recipe[]>(() => {
    return list.data?.pages.flatMap((page) => page.data) ?? [];
  }, [list.data]);

  return children({
    fetchNextPage: list.fetchNextPage,
    isLoading: list.isLoading,
    recipes,
  });
}
