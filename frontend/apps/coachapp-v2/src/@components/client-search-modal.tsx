import {getFullName, getInitials} from '@easy/utils';
import {Chip} from '@heroui/react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {type Client, useClientsInfiniteQuery} from '@/api/clients';
import {PickerModal} from '@/builder-kit/picker-modal';
import {SearchPickerBody} from '@/builder-kit/search-picker-sheet';

/**
 * Roster-wide client lookup as a picker (decision 2026-08-08: search left the
 * workbench rail for the Today card's utility footer + ⌘K). Pure identity
 * lookup over ALL clients — unlike ClientPickerContent, which is the
 * triage-aware assignment picker over active/pending only.
 */

// SearchPickerBody is multi-select-shaped; a jumper has no selection.
const NO_SELECTION = new Set<string>();

function statusLabel(client: Client): null | string {
  if (client.status === 'pending') {
    return 'Invited';
  }
  if (client.status === 'inactive') {
    return 'Inactive';
  }
  return null;
}

function ClientSearchContent({onDone}: {onDone: () => void}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const query = useClientsInfiniteQuery(deferredSearch ? {search: deferredSearch} : undefined);
  const list = useInfiniteItems(query);

  return (
    <SearchPickerBody
      error={list.isError}
      hasMore={query.hasNextPage}
      itemKey={(client) => String(client.id)}
      items={list.items}
      loading={list.isLoading || list.isFetchingNextPage}
      onLoadMore={list.fetchNextPage}
      onRetry={list.refetch}
      onSearchChange={setSearch}
      onToggleItem={(client) => {
        navigate(ROUTES.CLIENT_DETAIL.replace(':id', String(client.id)));
        onDone();
      }}
      renderItem={(client) => {
        const label = statusLabel(client);
        return (
          <span className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-pill bg-warning-soft type-eyebrow font-semibold text-warning-soft-foreground">
              {getInitials(client.first_name, client.last_name) || '?'}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex min-w-0 max-w-full items-center gap-1.5">
                <span className="truncate type-body font-medium">
                  {getFullName(client.first_name, client.last_name) || client.email || 'No name'}
                </span>
                {label ? (
                  <Chip
                    className="shrink-0"
                    size="sm"
                  >
                    {label}
                  </Chip>
                ) : null}
              </span>
              <span className="max-w-full truncate type-eyebrow font-normal text-muted">
                {client.email ?? client.phone ?? '—'}
              </span>
            </span>
          </span>
        );
      }}
      search={search}
      selectedKeys={NO_SELECTION}
      title="clients"
    />
  );
}

export function ClientSearchModal({onClose, open}: {onClose: () => void; open: boolean}) {
  return (
    <PickerModal
      onClose={onClose}
      open={open}
      title="Search clients"
    >
      <ClientSearchContent onDone={onClose} />
    </PickerModal>
  );
}
