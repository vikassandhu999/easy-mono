import type {Key} from '@heroui/react';

import type {ClientStatus} from '@/api/clients';

export type ClientListSelection = 'all' | Set<Key>;

export type ClientsListFilters = {
  search: string;
  /** Row order. `newest` is the endpoint's default. */
  sort?: 'last_active' | 'newest';
  status?: ClientStatus;
};
