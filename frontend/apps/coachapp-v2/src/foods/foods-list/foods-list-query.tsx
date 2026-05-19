import type {ReactNode} from 'react';

import {useMemo} from 'react';

import {type Food, useFoodsInfiniteQuery} from '@/api/foods';

import type {FoodsListFilters, FoodsListQueryResult} from './types';

type Props = FoodsListFilters & {
  children: (result: FoodsListQueryResult) => ReactNode;
};

export default function FoodsListQuery({children, search}: Props) {
  const list = useFoodsInfiniteQuery({search});

  const foods = useMemo<Food[]>(() => {
    return list.data?.pages.flatMap((page) => page.data) ?? [];
  }, [list.data]);

  return children({
    fetchNextPage: list.fetchNextPage,
    foods,
    isLoading: list.isLoading,
  });
}
