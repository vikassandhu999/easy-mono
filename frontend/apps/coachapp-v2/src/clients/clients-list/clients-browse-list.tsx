import {memo} from 'react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import ClientEmptyState from './client-empty-state';
import ClientsList from './client-list-box';
import ClientListItem from './client-list-item';
import type {ClientsListFilters} from './types';
import useClientsSearch from './use-clients-search';

type Props = ClientsListFilters & {
  hasFilter: boolean;
};

const ClientsBrowseList = memo(function ClientsBrowseList({hasFilter, search, status}: Props) {
  const navigate = useNavigate();

  const {clients, fetchNextPage, isLoading} = useClientsSearch({search, status, enabled: true});

  return (
    <ClientsList
      clients={clients}
      emptyState={<ClientEmptyState hasFilter={hasFilter || !!search} />}
      fetchNextPage={fetchNextPage}
      isLoading={isLoading}
      onAction={(key) => navigate(ROUTES.CLIENT_DETAIL.replace(':id', String(key)))}
      renderItem={(client) => <ClientListItem client={client} />}
      selectionMode="none"
    />
  );
});

export default ClientsBrowseList;
