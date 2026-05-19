import type {Key} from '@heroui/react';

import {
  Autocomplete,
  Button,
  Collection,
  EmptyState,
  ListBox,
  ListBoxLoadMoreItem,
  SearchField,
  Spinner,
  useFilter,
} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {
  type Client,
  type ClientSummary,
  type ListClientsFilters,
  useClientsInfiniteQuery,
  useListClientsQuery,
} from '@/api/clients';
import ClientCard from '@/clients/components/client-card';

type FilterOption = {
  id: string;
  label: string;
  filter: ListClientsFilters;
  summaryKey?: string;
};

const FILTER_OPTIONS: FilterOption[] = [
  {id: 'all', label: 'All', filter: {}},
  {id: 'active', label: 'Active', filter: {status: 'active'}, summaryKey: 'active'},
  {id: 'pending', label: 'Pending', filter: {status: 'pending'}, summaryKey: 'pending'},
  {id: 'inactive', label: 'Inactive', filter: {status: 'inactive'}, summaryKey: 'inactive'},
  {id: 'archived', label: 'Archived', filter: {status: 'archived'}, summaryKey: 'archived'},
];

function getOptionLabel(option: FilterOption, summary: ClientSummary | undefined): string {
  if (!summary || !option.summaryKey) return option.label;
  const count = (summary as Record<string, number>)[option.summaryKey];
  return count ? `${option.label} (${count})` : option.label;
}

export default function ListClients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<Key | null>('all');
  const {contains} = useFilter({sensitivity: 'base'});

  const debouncedSearch = useDebouncedValue(search);

  const {data: summaryData} = useListClientsQuery({limit: 0});
  const summary = summaryData?.summary;

  const queryArg: ListClientsFilters | undefined = useMemo(() => {
    const option = FILTER_OPTIONS.find((o) => o.id === activeFilter);
    const filters: ListClientsFilters = {...(option?.filter ?? {})};
    if (debouncedSearch) filters.search = debouncedSearch;
    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [debouncedSearch, activeFilter]);

  const list = useClientsInfiniteQuery(queryArg);

  const clients = useMemo<Client[]>(() => {
    return list.data?.pages.flatMap((page) => page.data) ?? [];
  }, [list.data]);

  const isFiltering = search.length > 0 || activeFilter !== 'all';

  return (
    <PageLayout
      action={
        <Button
          onPress={() => navigate(ROUTES.INVITE_CLIENT)}
          size="sm"
        >
          <Plus size={16} />
          Invite
        </Button>
      }
      title="Clients"
    >
      <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end py-2">
        <SearchField
          aria-label="Search clients"
          onChange={setSearch}
          value={search}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search by name, email, phone..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Autocomplete
          aria-label="Filter by status"
          onChange={(key) => setActiveFilter(key ?? 'all')}
          placeholder="All clients"
          selectionMode="single"
          value={activeFilter}
        >
          <Autocomplete.Trigger className="w-44">
            <Autocomplete.Value className="w-44" />
            <Autocomplete.ClearButton />
            <Autocomplete.Indicator />
          </Autocomplete.Trigger>
          <Autocomplete.Popover>
            <Autocomplete.Filter filter={contains}>
              <ListBox renderEmptyState={() => <EmptyState>No filters found</EmptyState>}>
                {FILTER_OPTIONS.map((option) => (
                  <ListBox.Item
                    id={option.id}
                    key={option.id}
                    textValue={option.label}
                  >
                    {getOptionLabel(option, summary)}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Autocomplete.Filter>
          </Autocomplete.Popover>
        </Autocomplete>
      </div>

      <ListBox
        aria-label="Clients"
        className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2"
        onAction={(key) => navigate(ROUTES.CLIENT_DETAIL.replace(':id', String(key)))}
        renderEmptyState={() => (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            {isFiltering ? (
              <>
                <p className="text-sm font-medium text-foreground-500">No clients found</p>
                <p className="text-xs text-foreground-400">
                  Try adjusting your search or filter to find what you&apos;re looking for.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground-500">No clients yet</p>
                <p className="text-xs text-foreground-400">Invite your first client to get started.</p>
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
            <span className="muted text-sm">Loading more...</span>
          </div>
        </ListBoxLoadMoreItem>
      </ListBox>
    </PageLayout>
  );
}
