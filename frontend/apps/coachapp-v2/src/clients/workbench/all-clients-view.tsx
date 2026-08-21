import type {Key} from '@heroui/react';

import {Button, ToggleButton, ToggleButtonGroup} from '@heroui/react';
import {ArrowUpDown} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {type ClientStatus, type ClientSummary, useClientsInfiniteQuery, useListClientsQuery} from '@/api/clients';
import ClientListItem from '@/clients/clients-list/client-list-item';

import {ViewShell} from './view-shell';

type FilterId = 'active' | 'all' | 'inactive' | 'invited';

type FilterOption = {
  id: FilterId;
  label: string;
  status?: ClientStatus;
  summaryKey?: keyof ClientSummary;
};

// The old "Needs attention" pill is gone on purpose — the workbench rail IS
// that pill, expanded into queues with definitions and exits.
const FILTER_OPTIONS: FilterOption[] = [
  {id: 'all', label: 'All'},
  {id: 'active', label: 'Active', status: 'active', summaryKey: 'active'},
  {id: 'invited', label: 'Invited', status: 'pending', summaryKey: 'pending'},
  {id: 'inactive', label: 'Inactive', status: 'inactive', summaryKey: 'inactive'},
];

// No search box here — the workbench's search field (in the rail / above the
// chips) is the roster's front door and already searches all clients.
export default function AllClientsView() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<FilterId>('all');
  const [sort, setSort] = useState<'last_active' | 'newest'>('newest');

  const activeStatus = FILTER_OPTIONS.find((option) => option.id === statusFilter)?.status;

  const list = useInfiniteItems(useClientsInfiniteQuery({sort, ...(activeStatus ? {status: activeStatus} : {})}));
  const {data: summaryData} = useListClientsQuery({limit: 0});

  const hasFilter = statusFilter !== 'all';

  const getCount = (option: FilterOption): number | undefined => {
    if (!summaryData) {
      return undefined;
    }
    return option.summaryKey ? summaryData.summary[option.summaryKey] : summaryData.count;
  };

  return (
    <ViewShell
      meta={summaryData ? `${summaryData.count} in total` : undefined}
      title="All clients"
      toolbar={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="-mx-4 min-w-0 max-w-full overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ToggleButtonGroup
              aria-label="Filter clients"
              className="flex w-max flex-nowrap gap-2"
              isDetached
              onSelectionChange={(keys: Set<Key>) => {
                const next = [...keys][0];
                if (next) {
                  setStatusFilter(next as FilterId);
                }
              }}
              selectedKeys={[statusFilter]}
              selectionMode="single"
            >
              {FILTER_OPTIONS.map((option) => {
                const count = getCount(option);
                return (
                  <ToggleButton
                    className="toggle-button--filter"
                    id={option.id}
                    key={option.id}
                  >
                    {option.label}
                    {count === undefined ? null : (
                      <span className="type-body font-light opacity-70">
                        {' '}
                        {count}
                      </span>
                    )}
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>
          </div>

          <Button
            className="button--row ms-auto gap-1.5 type-eyebrow text-muted"
            onPress={() => setSort((current) => (current === 'last_active' ? 'newest' : 'last_active'))}
            variant="ghost"
          >
            <ArrowUpDown className="size-3.5" />
            {sort === 'last_active' ? 'Last active' : 'Newest'}
          </Button>
        </div>
      }
    >
      <BrowseListBox
        ariaLabel="All clients"
        className="flex-1 gap-0 p-0"
        emptyState={
          <ListEmptyState
            createLabel="Invite client"
            createRoute={ROUTES.INVITE_CLIENT}
            emptyDescription="Invite your first client to get started."
            filterDescription="Try adjusting your filter to find what you're looking for."
            hasFilter={hasFilter}
            nounPlural="clients"
            onClearFilters={() => setStatusFilter('all')}
          />
        }
        fetchNextPage={list.fetchNextPage}
        isError={list.isError}
        isLoading={list.isLoading || list.isFetchingNextPage}
        items={list.items}
        onAction={(key) => navigate(ROUTES.CLIENT_DETAIL.replace(':id', String(key)))}
        onRetry={list.refetch}
        renderItem={(client) => (
          <ClientListItem
            client={client}
            key={client.id}
          />
        )}
        skeletonAvatar
      />
    </ViewShell>
  );
}
