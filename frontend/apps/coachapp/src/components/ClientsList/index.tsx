import {useMemo} from 'react';

import {Client, useListClients} from '@/services/clients';

import ClientCard from '../ClientCard';
import ListView from '../ListView';
import EmptyState from './EmptyState';

type Props = {
  search?: string;
  status?: any;
};

const ClientsList = ({search, status}: Props) => {
  const {data, isLoading, hasNextPage, isFetchingNextPage} = useListClients({search, status});
  const items = useMemo(() => {
    return data?.pages?.flatMap((page) => page.records) ?? [];
  }, [data]);
  return (
    <ListView<Client>
      emptyState={
        <EmptyState
          search={search}
          status={status}
        />
      }
      getKey={(client) => client.id}
      hasMore={hasNextPage}
      items={items}
      loadingMore={isFetchingNextPage}
      querying={isLoading}
      render={(client) => <ClientCard client={client} />}
    />
  );
};

export default ClientsList;
