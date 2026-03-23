import {Button, Input, Tabs} from '@heroui/react';
import {Plus, Search} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import InfiniteList from '@/@components/infinite-list';
import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {useInfiniteScroll} from '@/@hooks/use-infinite-scroll';
import {type Client, type ListClientsFilters, useClientsInfiniteQuery} from '@/api/clients';
import ClientCard from '@/clients/components/client-card';

const STATUS_TABS = [
  {id: 'all', label: 'All'},
  {id: 'active', label: 'Active'},
  {id: 'invited', label: 'Invited'},
  {id: 'inactive', label: 'Inactive'},
] as const;

export default function ListClients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const debouncedSearch = useDebouncedValue(search);

  const queryArg: ListClientsFilters | undefined = useMemo(() => {
    const filters: ListClientsFilters = {};
    if (debouncedSearch) filters.search = debouncedSearch;
    if (statusFilter !== 'all') filters.status = statusFilter;
    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [debouncedSearch, statusFilter]);

  const {data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading} = useClientsInfiniteQuery(queryArg);

  // Flatten all pages into a single array
  const clients = useMemo<Client[]>(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data?.pages]);

  const {sentinelRef} = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const isFiltering = search.length > 0 || statusFilter !== 'all';

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
      {/* Search + Filter */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400"
            size={16}
          />
          <Input
            aria-label="Search clients"
            className="pl-9"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            type="search"
            value={search}
          />
        </div>

        <Tabs
          defaultSelectedKey="all"
          onSelectionChange={(key) => setStatusFilter(String(key))}
          selectedKey={statusFilter}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="Filter by status">
              {STATUS_TABS.map((tab) => (
                <Tabs.Tab
                  id={tab.id}
                  key={tab.id}
                >
                  {tab.label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
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
        keyExtractor={(client) => client.id}
        renderItem={(client) => <ClientCard client={client} />}
        sentinelRef={sentinelRef}
      />
    </PageLayout>
  );
}
