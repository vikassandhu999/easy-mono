import {Button, Input, Spinner, Tabs} from '@heroui/react';
import {Plus, Search} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useListClientsQuery} from '@/api/clients';
import ClientCard from '@/clients/components/client-card';

const STATUS_TABS = [
  {id: 'all', label: 'All'},
  {id: 'active', label: 'Active'},
  {id: 'pending', label: 'Pending'},
  {id: 'inactive', label: 'Inactive'},
] as const;

export default function ListClients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const queryParams = {
    ...(search && {search}),
    ...(statusFilter !== 'all' && {status: statusFilter}),
  };

  const {data, isError, isLoading} = useListClientsQuery(Object.keys(queryParams).length > 0 ? queryParams : undefined);
  const clients = data?.data ?? [];
  const hasClients = clients.length > 0;
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

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner color="accent" />
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center text-sm text-danger">
          Failed to load clients. Please try again.
        </div>
      )}

      {/* Client list */}
      {!isLoading && !isError && hasClients && (
        <div className="flex flex-col gap-2">
          {clients.map((client) => (
            <ClientCard
              client={client}
              key={client.id}
            />
          ))}
        </div>
      )}

      {/* Empty states */}
      {!isLoading && !isError && !hasClients && (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          {isFiltering ? (
            <>
              <p className="text-sm font-medium text-foreground-500">No clients found</p>
              <p className="text-xs text-foreground-400">
                Try adjusting your search or filter to find what you're looking for.
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
    </PageLayout>
  );
}
