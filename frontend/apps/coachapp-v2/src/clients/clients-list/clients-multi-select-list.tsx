import type {Key} from '@heroui/react';

import {memo} from 'react';

import type {Client} from '@/api/clients';
import ClientEmptyState from './client-empty-state';
import ClientsList from './client-list-box';
import ClientListItem from './client-list-item';
import ClientsListQuery from './clients-list-query';
import type {ClientListSelection, ClientsListFilters} from './types';

type Props = ClientsListFilters & {
  hasFilter: boolean;
  onSelectionChange: (keys: ClientListSelection, clients: Client[]) => void;
  selectedKeys?: 'all' | Iterable<Key>;
};

const ClientsMultiSelectList = memo(function ClientsMultiSelectList({
  hasFilter,
  onSelectionChange,
  search,
  selectedKeys,
  status,
}: Props) {
  return (
    <ClientsListQuery
      search={search}
      status={status}
    >
      {({clients, fetchNextPage, isLoading}) => (
        <ClientsList
          clients={clients}
          emptyState={<ClientEmptyState hasFilter={hasFilter || !!search} />}
          fetchNextPage={fetchNextPage}
          isLoading={isLoading}
          onSelectionChange={(keys) => {
            const selectedClients = keys === 'all' ? clients : clients.filter((client) => keys.has(client.id));
            onSelectionChange(keys, selectedClients);
          }}
          renderItem={(client) => (
            <ClientListItem
              client={client}
              showIndicator
              showQuickActions={false}
            />
          )}
          selectedKeys={selectedKeys}
          selectionMode="multiple"
        />
      )}
    </ClientsListQuery>
  );
});

export default ClientsMultiSelectList;
