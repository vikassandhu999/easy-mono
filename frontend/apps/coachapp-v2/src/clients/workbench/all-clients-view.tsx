import type {Key} from '@heroui/react';

import {Button, SearchField, ToggleButton, ToggleButtonGroup} from '@heroui/react';
import {ArrowUpDown} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {type ClientStatus, type ClientSummary, useClientsInfiniteQuery, useListClientsQuery} from '@/api/clients';
import ClientListItem from '@/clients/clients-list/client-list-item';

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

const SEARCH_GROUP =
  'min-h-9 gap-2 rounded-control border border-border bg-background type-body leading-[normal] [box-shadow:none] text-muted';

export default function AllClientsView() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterId>('all');
  const [sort, setSort] = useState<'last_active' | 'newest'>('newest');

  const deferredSearch = useDeferredValue(search);
  const activeStatus = FILTER_OPTIONS.find((option) => option.id === statusFilter)?.status;

  const list = useInfiniteItems(useClientsInfiniteQuery({search: deferredSearch, sort, status: activeStatus}));
  const {data: summaryData} = useListClientsQuery({limit: 0});

  const hasFilter = !!deferredSearch || statusFilter !== 'all';

  const getCount = (option: FilterOption): number | undefined => {
    if (!summaryData) {
      return undefined;
    }
    return option.summaryKey ? summaryData.summary[option.summaryKey] : summaryData.count;
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <SearchField
          aria-label="Search clients"
          className="w-full min-w-0 sm:max-w-64 sm:flex-1"
          onChange={setSearch}
          value={search}
        >
          <SearchField.Group className={SEARCH_GROUP}>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search clients" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

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

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <BrowseListBox
          ariaLabel="All clients"
          className="flex-1 gap-0 p-0"
          emptyState={
            <ListEmptyState
              createLabel="Invite client"
              createRoute={ROUTES.INVITE_CLIENT}
              emptyDescription="Invite your first client to get started."
              filterDescription="Try adjusting your search or filter to find what you're looking for."
              hasFilter={hasFilter}
              nounPlural="clients"
              onClearFilters={() => {
                setSearch('');
                setStatusFilter('all');
              }}
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
      </div>
    </div>
  );
}
