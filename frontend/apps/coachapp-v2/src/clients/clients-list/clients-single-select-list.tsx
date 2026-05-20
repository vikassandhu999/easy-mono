import type {Key} from '@heroui/react';

import {memo, useMemo} from 'react';

import type {Client} from '@/api/clients';
import ClientEmptyState from './client-empty-state';
import ClientListBox from './client-list-box';
import ClientListItem from './client-list-item';
import ClientsListQuery from './clients-list-query';
import type {ClientListSelection, ClientsListFilters} from './types';

type Props = ClientsListFilters & {
  hasFilter: boolean;
  onSelectionChange: (key: Key | null, client?: Client) => void;
  selectedKey?: Key | null;
};

function getSelectedKey(keys: ClientListSelection): Key | null {
  if (keys === 'all') {
    return null;
  }
  return Array.from(keys)[0] ?? null;
}

const ClientsSingleSelectList = memo(function ClientsSingleSelectList({
  hasFilter,
  onSelectionChange,
  search,
  selectedKey,
  status,
}: Props) {
  const selectedKeys = useMemo(() => (selectedKey ? new Set([selectedKey]) : new Set<Key>()), [selectedKey]);

  return (
    <ClientsListQuery
      search={search}
      status={status}
    >
      {({clients, fetchNextPage, isLoading}) => (
        <ClientListBox
          clients={clients}
          emptyState={<ClientEmptyState hasFilter={hasFilter || !!search} />}
          fetchNextPage={fetchNextPage}
          isLoading={isLoading}
          onSelectionChange={(keys) => {
            const key = getSelectedKey(keys);
            onSelectionChange(key, key ? clients.find((client) => client.id === String(key)) : undefined);
          }}
          renderItem={(client) => (
            <ClientListItem
              client={client}
              showIndicator
              showQuickActions={false}
            />
          )}
          selectedKeys={selectedKeys}
          selectionMode="single"
        />
      )}
    </ClientsListQuery>
  );
});

export default ClientsSingleSelectList;
