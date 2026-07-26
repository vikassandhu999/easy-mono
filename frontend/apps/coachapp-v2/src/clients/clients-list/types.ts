import type {Key} from '@heroui/react';

export type ClientListSelection = 'all' | Set<Key>;

export type ClientsListFilters = {
  search: string;
  /** Row order. `newest` is the endpoint's default. */
  sort?: 'last_active' | 'newest';
  status?: string;
};
