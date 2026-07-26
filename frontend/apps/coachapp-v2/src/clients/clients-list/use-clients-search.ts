import {useMemo} from 'react';

import {type Client, useClientsInfiniteQuery} from '@/api/clients';

import type {ClientsListFilters} from './types';

export default function useClientsSearch({
  search,
  sort,
  status,
  enabled = true,
}: ClientsListFilters & {enabled?: boolean}) {
  const list = useClientsInfiniteQuery(
    {
      search,
      sort,
      status,
    },
    {skip: !enabled},
  );

  const clients = useMemo<Client[]>(() => {
    return list.data?.pages.flatMap((page) => page.data) ?? [];
  }, [list.data]);

  return {
    clients,
    fetchNextPage: list.fetchNextPage,
    isError: list.isError,
    isFetchingNextPage: list.isFetchingNextPage,
    isLoading: list.isLoading,
    refetch: list.refetch,
  };
}
