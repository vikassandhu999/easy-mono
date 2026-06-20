import type {Key} from '@heroui/react';

export type ClientListSelection = 'all' | Set<Key>;

export type ClientsListFilters = {
  search: string;
  status?: string;
};
