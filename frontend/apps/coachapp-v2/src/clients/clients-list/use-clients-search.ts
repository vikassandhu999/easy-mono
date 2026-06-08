import {useMemo} from 'react';

import {type Client, useClientsInfiniteQuery} from '@/api/clients';

import type {ClientsListFilters} from './types';

export default function useClientsSearch({search, status, enabled}: ClientsListFilters & {enabled: boolean}) {
  const list = useClientsInfiniteQuery(
    {
      search,
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
    isLoading: list.isLoading,
  };
}
