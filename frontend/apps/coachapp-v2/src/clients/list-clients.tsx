import type {Key} from '@heroui/react';

import {Autocomplete, Button, EmptyState, ListBox, SearchField, useFilter} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import InfiniteList from '@/@components/infinite-list';
import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {useInfiniteScroll} from '@/@hooks/use-infinite-scroll';
import {
  type Client,
  type ClientSummary,
  type ListClientsFilters,
  useClientsInfiniteQuery,
  useListClientsQuery,
} from '@/api/clients';
import ClientCard from '@/clients/components/client-card';

// ── Filter options ───────────────────────────────────────────

type FilterOption = {
  id: string;
  label: string;
  filter: ListClientsFilters;
  summaryKey?: string;
};

const FILTER_OPTIONS: FilterOption[] = [
  {id: 'all', label: 'All', filter: {}},
  {id: 'active', label: 'Active', filter: {status: 'active'}, summaryKey: 'active'},
  {id: 'expiring', label: 'Expiring', filter: {status: 'expiring'}, summaryKey: 'expiring'},
  {id: 'payment_due', label: 'Payment Due', filter: {payment_status: 'pending,partial'}, summaryKey: 'payment_due'},
  {id: 'pending', label: 'Pending', filter: {status: 'pending'}, summaryKey: 'pending'},
  {id: 'expired', label: 'Expired', filter: {status: 'expired'}, summaryKey: 'expired'},
  {id: 'archived', label: 'Archived', filter: {status: 'archived'}},
];

function getOptionLabel(option: FilterOption, summary: ClientSummary | undefined): string {
  if (!summary || !option.summaryKey) return option.label;
  const count = (summary as Record<string, number>)[option.summaryKey];
  return count ? `${option.label} (${count})` : option.label;
}

// ── Main component ───────────────────────────────────────────

export default function ListClients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<Key | null>('all');
  const {contains} = useFilter({sensitivity: 'base'});

  const debouncedSearch = useDebouncedValue(search);

  // Fetch summary counts (lightweight query with limit=0)
  const {data: summaryData} = useListClientsQuery({limit: 0});
  const summary = summaryData?.summary;

  const queryArg: ListClientsFilters | undefined = useMemo(() => {
    const option = FILTER_OPTIONS.find((o) => o.id === activeFilter);
    const filters: ListClientsFilters = {...(option?.filter ?? {})};
    if (debouncedSearch) filters.search = debouncedSearch;
    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [debouncedSearch, activeFilter]);

  const {data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading} = useClientsInfiniteQuery(queryArg);

  // Use queryArg as key to force InfiniteList remount when filters change
  const queryArgStr = useMemo(() => JSON.stringify(queryArg), [queryArg]);

  const clients = useMemo<Client[]>(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  const {sentinelRef} = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

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
      {/* Search + status filter */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
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
        </div>

        {/* Status filter */}
        <Autocomplete
          aria-label="Filter by status"
          className="w-full sm:w-44"
          onChange={(key) => setActiveFilter(key ?? 'all')}
          placeholder="All clients"
          selectionMode="single"
          value={activeFilter}
        >
          <Autocomplete.Trigger>
            <Autocomplete.Value />
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

      <InfiniteList
        emptyState={
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
        }
        hasNextPage={hasNextPage}
        isError={isError}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        items={clients}
        key={queryArgStr}
        keyExtractor={(client) => client.id}
        renderItem={(client) => <ClientCard client={client} />}
        sentinelRef={sentinelRef}
      />
    </PageLayout>
  );
}
