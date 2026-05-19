import type {Key} from '@heroui/react';

import type {Client} from '@/api/clients';

export type ClientListSelection = 'all' | Set<Key>;

export type ClientsListFilters = {
  search: string;
  status?: string;
};

export type ClientsListQueryResult = {
  clients: Client[];
  fetchNextPage: () => void;
  isLoading: boolean;
};
