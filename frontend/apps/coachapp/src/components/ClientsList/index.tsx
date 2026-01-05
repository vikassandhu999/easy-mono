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
  const {data, isLoading} = useListClients({search, status});
  const items = useMemo(() => {
    return data?.pages?.flatMap((page) => page.records) ?? [];
  }, [data]);
  return (
    <ListView<Client>
      emptyState={<EmptyState />}
      getKey={(client) => client.id}
      items={items}
      querying={isLoading}
      render={(client) => <ClientCard client={client} />}
    />
  );
};

export default ClientsList;
