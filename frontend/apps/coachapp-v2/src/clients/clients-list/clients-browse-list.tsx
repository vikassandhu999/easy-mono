import {memo} from 'react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';

import type {ClientsListFilters} from './types';

import ClientEmptyState from './client-empty-state';
import ClientListBox from './client-list-box';
import ClientListItem from './client-list-item';
import ClientsListQuery from './clients-list-query';

type Props = ClientsListFilters & {
  hasFilter: boolean;
};

const ClientsBrowseList = memo(function ClientsBrowseList({hasFilter, search, status}: Props) {
  const navigate = useNavigate();

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
          onAction={(key) => navigate(ROUTES.CLIENT_DETAIL.replace(':id', String(key)))}
          renderItem={(client) => (
            <ClientListItem
              className={'transition-none transform-none animate-none'}
              client={client}
            />
          )}
          selectionMode="none"
        />
      )}
    </ClientsListQuery>
  );
});

export default ClientsBrowseList;
