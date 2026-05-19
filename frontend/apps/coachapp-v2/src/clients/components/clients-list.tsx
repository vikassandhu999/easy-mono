import {Button, Collection, ListBox, ListBoxLoadMoreItem, Spinner, Typography} from '@heroui/react';
import {Plus} from 'lucide-react';
import {memo, useMemo} from 'react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {type Client, useClientsInfiniteQuery} from '@/api/clients';
import ClientCard from '@/clients/components/client-card';

type Props = {
  hasFilter: boolean;
  search: string;
  status?: string;
};

const ClientsList = memo(function ClientsList({hasFilter, search, status}: Props) {
  const navigate = useNavigate();

  const list = useClientsInfiniteQuery({
    search,
    status,
  });

  const clients = useMemo<Client[]>(() => {
    return list.data?.pages.flatMap((page) => page.data) ?? [];
  }, [list.data]);

  return (
    <ListBox
      aria-label="Clients"
      className="flex-1"
      onAction={(key) => navigate(ROUTES.CLIENT_DETAIL.replace(':id', String(key)))}
      renderEmptyState={() => (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          {hasFilter || search ? (
            <>
              <Typography type="h5">No clients found</Typography>
              <Typography
                color="muted"
                type="body-xs"
              >
                Try adjusting your search or filter to find what you&apos;re looking for.
              </Typography>
            </>
          ) : (
            <>
              <Typography type="h5">No clients yet</Typography>
              <Typography
                color="muted"
                type="body-xs"
              >
                Invite your first client to get started.
              </Typography>
              <Button
                className="mt-3"
                onPress={() => navigate(ROUTES.INVITE_CLIENT)}
                size="sm"
              >
                <Plus size={16} />
                Invite Client
              </Button>
            </>
          )}
        </div>
      )}
      selectionMode={'none'}
    >
      <Collection items={clients}>{(client) => <ClientCard client={client} />}</Collection>
      <ListBoxLoadMoreItem
        isLoading={list.isLoading}
        onLoadMore={list.fetchNextPage}
      >
        <div className="flex items-center justify-center gap-2 py-2">
          <Spinner size="sm" />
          <Typography
            color="muted"
            type="body-sm"
          >
            Loading more...
          </Typography>
        </div>
      </ListBoxLoadMoreItem>
    </ListBox>
  );
});

export default ClientsList;
