import type {ReactNode} from 'react';

import {useMemo} from 'react';

import {type Client, useClientsInfiniteQuery} from '@/api/clients';

import type {ClientsListFilters, ClientsListQueryResult} from './types';

type Props = ClientsListFilters & {
  children: (result: ClientsListQueryResult) => ReactNode;
  enabled?: boolean;
};

export default function ClientsListQuery({children, enabled = true, search, status}: Props) {
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

  return children({
    clients,
    fetchNextPage: list.fetchNextPage,
    isLoading: list.isLoading,
  });
}
