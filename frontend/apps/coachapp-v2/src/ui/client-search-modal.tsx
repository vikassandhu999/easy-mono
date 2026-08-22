import {getFullName, getInitials} from '@easy/utils';
import {Avatar, Chip, Description, Label, ListBox, SearchField} from '@heroui/react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {type Client, useClientsInfiniteQuery} from '@/api/clients';
import {ROUTES} from '@/routes';
import BrowseListBox, {LIST_ITEM_CLASS} from '@/ui/browse-list-box';
import ListEmptyState from '@/ui/list-empty-state';
import {PickerModal} from '@/ui/picker-modal';
import {useInfiniteItems} from '@/ui/use-infinite-items';

/**
 * Roster-wide client lookup as a picker (decision 2026-08-08: search left the
 * workbench rail for the Today card's utility footer + ⌘K). Pure identity
 * lookup over ALL clients — unlike ClientPickerContent, which is the
 * triage-aware assignment picker over active/pending only.
 */

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
    <>
      <div className="sticky top-0 z-10 bg-surface pb-2 pt-2">
        <SearchField
          aria-label="Search clients"
          autoFocus
          onChange={setSearch}
          value={search}
          variant="secondary"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>
      <BrowseListBox
        ariaLabel="Clients"
        className="gap-0 p-0"
        emptyState={
          <ListEmptyState
            emptyDescription="Clients will show up here once they are invited."
            hasFilter={search.trim().length > 0}
            nounPlural="clients"
            onClearFilters={() => setSearch('')}
          />
        }
        fetchNextPage={list.fetchNextPage}
        isError={list.isError}
        isLoading={list.isLoading || list.isFetchingNextPage}
        items={list.items}
        onAction={(key) => {
          navigate(ROUTES.CLIENT_DETAIL.replace(':id', String(key)));
          onDone();
        }}
        onRetry={list.refetch}
        renderItem={(client) => {
          const name = getFullName(client.first_name, client.last_name) || client.email || 'No name';
          const label = statusLabel(client);

          return (
            <ListBox.Item
              className={LIST_ITEM_CLASS}
              id={client.id}
              textValue={name}
            >
              <Avatar size="md">
                <Avatar.Fallback className="bg-warning-soft font-semibold text-warning-soft-foreground">
                  {getInitials(client.first_name, client.last_name) || '?'}
                </Avatar.Fallback>
              </Avatar>
              <span className="flex min-w-0 flex-1 flex-col">
                <Label className="max-w-full truncate type-body font-medium">{name}</Label>
                <Description className="max-w-full truncate type-eyebrow text-muted">
                  {client.email ?? client.phone ?? '—'}
                </Description>
              </span>
              {label ? (
                <Chip
                  className="shrink-0"
                  size="sm"
                >
                  {label}
                </Chip>
              ) : null}
            </ListBox.Item>
          );
        }}
        skeletonAvatar
      />
    </>
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
