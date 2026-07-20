import type {Key} from '@heroui/react';

import {Button, SearchField, Separator, ToggleButton, ToggleButtonGroup} from '@heroui/react';
import {cn} from '@heroui/styles';
import {UserPlus} from 'lucide-react';
import {useDeferredValue, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox, {FILTER_PILL_CLASS} from '@/@components/browse-list-box';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {type ClientSummary, useListClientsQuery} from '@/api/clients';
import {type Client, useListAttentionClientsQuery} from '@/api/generated';

import ClientEmptyState from './clients-list/client-empty-state';
import ClientListItem from './clients-list/client-list-item';
import useClientsSearch from './clients-list/use-clients-search';

type FilterId = 'active' | 'all' | 'attention' | 'inactive' | 'invited';

type FilterOption = {
  id: FilterId;
  /** COPY.md §CL gives shorter labels for the mobile pill row. */
  label: string;
  shortLabel: string;
  status?: string;
  summaryKey?: keyof ClientSummary;
};

const FILTER_OPTIONS: FilterOption[] = [
  {id: 'all', label: 'All', shortLabel: 'All'},
  {id: 'active', label: 'Active', shortLabel: 'Active', status: 'active', summaryKey: 'active'},
  {id: 'attention', label: 'Needs attention', shortLabel: 'Attention'},
  {id: 'invited', label: 'Invited', shortLabel: 'Invited', status: 'pending', summaryKey: 'pending'},
  {id: 'inactive', label: 'Inactive', shortLabel: 'Inactive', status: 'inactive', summaryKey: 'inactive'},
];

const ATTENTION_PAGE_SIZE = 100;

function matchesSearch(client: Client, search: string): boolean {
  const haystack = [client.first_name, client.last_name, client.email, client.phone]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(search.trim().toLowerCase());
}

export default function ListClients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');

  const deferredSearch = useDeferredValue(search);
  const isAttention = activeFilter === 'attention';
  const activeStatus = FILTER_OPTIONS.find((option) => option.id === activeFilter)?.status;

  const list = useClientsSearch({
    enabled: !isAttention,
    search: deferredSearch,
    status: activeStatus,
  });
  // "Needs attention" is not a value of the list endpoint's `status` filter —
  // it has its own endpoint (the same one the dashboard uses), which is flat and
  // has no search param, so search composes client-side for that tab only.
  // Off-tab we only need `count` for the pill, so ask for zero rows; the full
  // page loads when the tab is actually selected.
  const attention = useListAttentionClientsQuery({limit: isAttention ? ATTENTION_PAGE_SIZE : 0, offset: 0});
  const {data: summaryData} = useListClientsQuery({limit: 0});

  const attentionClients = useMemo(
    () => (attention.data?.data ?? []).filter((client) => matchesSearch(client, deferredSearch)),
    [attention.data, deferredSearch],
  );

  const items: Client[] = isAttention ? attentionClients : list.clients;
  const hasFilter = !!deferredSearch || activeFilter !== 'all';
  const clearFilters = () => {
    setSearch('');
    setActiveFilter('all');
  };

  function getCount(option: FilterOption): number | undefined {
    if (option.id === 'attention') {
      return attention.data?.count;
    }
    if (!summaryData) {
      return undefined;
    }
    return option.summaryKey ? summaryData.summary[option.summaryKey] : summaryData.count;
  }

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup>
          <Page.Title>Clients</Page.Title>
          <Page.Description>
            {summaryData
              ? `${summaryData.summary.active} active · ${summaryData.summary.pending} invited`
              : 'Your coaching roster'}
          </Page.Description>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            aria-label="Invite client"
            onPress={() => navigate(ROUTES.INVITE_CLIENT)}
            variant="primary"
          >
            <UserPlus className="size-4" />
            <span className="hidden sm:inline">Invite client</span>
          </Button>
        </Page.Actions>
      </Page.Header>

      <Page.Toolbar
        className="sticky top-0 z-10 flex flex-wrap items-center gap-3 bg-background pt-2 pb-3"
        size="content"
      >
        <SearchField
          aria-label="Search clients"
          className="w-full min-w-0 sm:max-w-72 sm:flex-1"
          onChange={setSearch}
          value={search}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search clients" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Separator
          className="hidden h-6 sm:block"
          orientation="vertical"
        />
        <div className="-mx-4 min-w-0 max-w-full overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ToggleButtonGroup
            aria-label="Filter clients by status"
            className="flex w-max flex-nowrap gap-2"
            isDetached
            onSelectionChange={(keys: Set<Key>) => {
              const next = [...keys][0];
              if (next) {
                setActiveFilter(next as FilterId);
              }
            }}
            selectedKeys={[activeFilter]}
            selectionMode="single"
          >
            {FILTER_OPTIONS.map((option) => {
              const count = getCount(option);

              return (
                <ToggleButton
                  className={FILTER_PILL_CLASS}
                  id={option.id}
                  key={option.id}
                >
                  <span className="hidden sm:inline">{option.label}</span>
                  <span className="sm:hidden">{option.shortLabel}</span>
                  {count === undefined ? null : (
                    // COPY.md §CL: mobile pills carry a count on `All` only.
                    <span className={cn('ms-1 text-chip opacity-70', option.id === 'all' ? '' : 'hidden sm:inline')}>
                      {count}
                    </span>
                  )}
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </div>
      </Page.Toolbar>

      <Page.Content bare>
        <Page.Frame
          className="flex min-h-0 flex-1 flex-col pb-6"
          size="content"
        >
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            <BrowseListBox
              ariaLabel="Clients"
              className="flex-1 gap-0 p-0"
              emptyState={
                <ClientEmptyState
                  hasFilter={hasFilter}
                  onClearFilters={clearFilters}
                />
              }
              fetchNextPage={isAttention ? () => undefined : list.fetchNextPage}
              isError={isAttention ? attention.isError : list.isError}
              isLoading={isAttention ? attention.isLoading : list.isLoading || list.isFetchingNextPage}
              items={items}
              onAction={(key) => navigate(ROUTES.CLIENT_DETAIL.replace(':id', String(key)))}
              onRetry={isAttention ? attention.refetch : list.refetch}
              renderItem={(client) => <ClientListItem client={client} />}
              skeletonAvatar
            />
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
