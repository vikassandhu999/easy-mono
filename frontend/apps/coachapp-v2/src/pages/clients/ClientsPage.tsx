import {
  Button,
  Card,
  Skeleton,
} from '@heroui/react';
import {ArrowUpDown, Plus, Search} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router';

import {useListClientsQuery} from '@/api/clients';
import type {Client} from '@/api/clients';
import InviteClientModal from '@/pages/clients/InviteClientModal';
import {CLIENT_STATUS_STYLES, formatDate, getClientInitial, getClientName} from '@/pages/clients/clientDisplay';

const SORT_OPTIONS = [
  {key: 'recent', label: 'Recently Active'},
  {key: 'newest', label: 'Newest First'},
  {key: 'oldest', label: 'Oldest First'},
  {key: 'name', label: 'Name A-Z'},
] as const;

const FILTER_TABS = ['All', 'Active', 'Onboarding', 'Inactive'] as const;

export default function ClientsPage() {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['key']>('recent');
  const [filterStatus, setFilterStatus] = useState<'all' | Client['status']>('all');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const {data, isError, isLoading, refetch} = useListClientsQuery({
    limit: 100,
    offset: 0,
    status: filterStatus === 'all' ? undefined : filterStatus,
  });

  const activeSortLabel = SORT_OPTIONS.find((option) => option.key === sortBy)?.label ?? SORT_OPTIONS[0].label;

  const openInviteModal = () => {
    setIsInviteOpen(true);
  };

  const handleRotateSort = () => {
    const currentIndex = SORT_OPTIONS.findIndex((option) => option.key === sortBy);
    const nextIndex = currentIndex === SORT_OPTIONS.length - 1 ? 0 : currentIndex + 1;
    const nextOption = SORT_OPTIONS[nextIndex];

    if (nextOption) {
      setSortBy(nextOption.key);
    }
  };

  const displayedClients = useMemo(() => {
    const apiClients = data?.data ?? [];

    const filtered = apiClients.filter((client) => {
      if (filterStatus === 'all') return true;
      return client.status.toLowerCase() === filterStatus;
    });

    return [...filtered].sort((left, right) => {
      if (sortBy === 'name') {
        const leftName = `${left.first_name ?? ''} ${left.last_name ?? ''}`.trim() || left.email;
        const rightName = `${right.first_name ?? ''} ${right.last_name ?? ''}`.trim() || right.email;
        return leftName.localeCompare(rightName);
      }

      const leftJoined = new Date(left.inserted_at).getTime();
      const rightJoined = new Date(right.inserted_at).getTime();
      const leftUpdated = new Date(left.updated_at).getTime();
      const rightUpdated = new Date(right.updated_at).getTime();

      if (sortBy === 'recent') {
        return rightUpdated - leftUpdated;
      }

      if (sortBy === 'newest') {
        return rightJoined - leftJoined;
      }

      if (sortBy === 'oldest') {
        return leftJoined - rightJoined;
      }

      return 0;
    });
  }, [data?.data, filterStatus, sortBy]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">Manage</p>
          <h1 className="text-2xl font-semibold md:text-3xl">Clients</h1>
          <p className="max-w-2xl text-sm text-muted">
            Track progress, review activity, and keep every client program on schedule.
          </p>
        </div>

        <Button
          className="min-h-11 w-full gap-2 sm:w-auto"
          onPress={openInviteModal}
          size="lg"
          variant="primary"
        >
          <Plus className="h-4 w-4" />
          <span>Add Client</span>
        </Button>
      </div>

      <div className="flex flex-col gap-3 border-b border-separator pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const tabValue = tab.toLowerCase() as 'all' | Client['status'];
            const isActive = tabValue === filterStatus;

            return (
              <Button
                className="min-h-11 shrink-0"
                key={tab}
                onPress={() => setFilterStatus(tabValue)}
                size="md"
                variant={isActive ? 'secondary' : 'ghost'}
              >
                {tab}
              </Button>
            );
          })}
        </div>

        <Button
          className="min-h-11 w-full justify-start gap-2 sm:w-auto sm:justify-center"
          onPress={handleRotateSort}
          size="md"
          variant="outline"
        >
          <ArrowUpDown className="h-4 w-4" />
          <span>Sort: {activeSortLabel}</span>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {filterStatus === 'all' ? 'All Clients' : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Clients`}
        </h2>
        <p className="text-sm text-muted">{displayedClients.length} total</p>
      </div>

      {isError ? (
        <Card className="border border-separator bg-surface p-6">
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-foreground">Could not load clients</p>
            <p className="text-sm text-muted">Please try again. If this continues, check API connectivity.</p>
            <div>
              <Button onPress={() => refetch()} size="md" variant="outline">
                Retry
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {!isError ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
          ? [1, 2, 3, 4, 5, 6].map((index) => (
              <Card className="border border-separator bg-surface p-4" key={index}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </Card>
            ))
          : displayedClients.map((client) => (
              <Card
                className="border border-separator bg-surface p-4 text-left transition-none"
                key={client.id}
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent font-semibold text-foreground">
                        {getClientInitial(client)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{getClientName(client)}</span>
                        <span className="text-sm text-muted">{client.email}</span>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${CLIENT_STATUS_STYLES[client.status] ?? 'bg-default text-muted'}`}
                    >
                      {client.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-muted">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">{client.phone || '—'}</span>
                      <span>Phone</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground capitalize">{client.status}</span>
                      <span>Status</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-separator pt-3 text-xs text-muted">
                    <span>Joined {formatDate(client.inserted_at)}</span>
                    <span>Updated {formatDate(client.updated_at)}</span>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      ) : null}

      {displayedClients.length === 0 && !isLoading && !isError && (
        <Card className="border border-separator bg-surface p-6 sm:p-8">
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-secondary">
              <Search className="h-8 w-8 text-muted" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">No clients found</p>
              <p className="text-sm text-muted">Try adjusting your filters or add a new client.</p>
            </div>
            <Button
              className="gap-2"
              onPress={openInviteModal}
              size="lg"
              variant="primary"
            >
              <Plus className="h-4 w-4" />
              <span>Add Client</span>
            </Button>
          </div>
        </Card>
      )}

      <InviteClientModal
        isOpen={isInviteOpen}
        onInvited={refetch}
        onOpenChange={setIsInviteOpen}
      />
    </div>
  );
}
