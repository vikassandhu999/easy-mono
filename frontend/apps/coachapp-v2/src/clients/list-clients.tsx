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

const CLIENT_FILTER_CLASS = cn(
  FILTER_PILL_CLASS,
  'me-2.5 rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 text-sm shadow-none',
  'data-[selected=true]:border-foreground data-[selected=true]:bg-transparent data-[selected=true]:text-foreground',
  'sm:me-0 sm:rounded-control sm:border sm:border-border sm:bg-surface sm:px-3.5 sm:text-pill',
  'sm:data-[selected=true]:border-ink sm:data-[selected=true]:bg-ink sm:data-[selected=true]:text-ink-foreground',
);

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
      <Page.Header
        className="bg-surface pb-1 sm:bg-transparent sm:pb-2 lg:pt-7"
        size="content"
      >
        <Page.TitleGroup>
          <Page.Title>Clients</Page.Title>
          <Page.Description className="hidden sm:block">
            {summaryData
              ? `${summaryData.summary.active} active · ${summaryData.summary.pending} invited`
              : 'Your coaching roster'}
          </Page.Description>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            aria-label="Invite client"
            className="min-h-11 min-w-11 rounded-control sm:min-h-0 sm:min-w-0"
            onPress={() => navigate(ROUTES.INVITE_CLIENT)}
            variant="primary"
          >
            <UserPlus className="size-4" />
            <span className="hidden sm:inline">Invite client</span>
          </Button>
        </Page.Actions>
      </Page.Header>

      <Page.Toolbar
        className="sticky top-0 z-10 mb-0 flex flex-wrap items-center gap-x-3 gap-y-0 border-b border-border bg-surface pt-0 pb-0 sm:mb-1.5 sm:gap-3 sm:border-0 sm:bg-background sm:pt-2 sm:pb-3 lg:pt-0"
        size="content"
      >
        <SearchField
          aria-label="Search clients"
          className="w-full min-w-0 sm:max-w-64 sm:flex-1"
          onChange={setSearch}
          value={search}
        >
          <SearchField.Group className="min-h-11 border border-border bg-background shadow-none sm:min-h-0 sm:bg-surface">
            <SearchField.SearchIcon />
            <SearchField.Input
              className="min-h-11 sm:min-h-0"
              placeholder="Search clients"
            />
            <SearchField.ClearButton className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0" />
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
                  className={CLIENT_FILTER_CLASS}
                  id={option.id}
                  key={option.id}
                >
                  <span className="hidden sm:inline">{option.label}</span>
                  <span className="sm:hidden">{option.shortLabel}</span>
                  {count === undefined ? null : (
                    // Mobile carries a count on the selected filter only.
                    <span
                      className={cn(
                        'ms-1 rounded-full bg-surface-secondary px-1.5 py-0.5 text-chip font-bold',
                        'sm:bg-transparent sm:px-0 sm:py-0 sm:font-normal sm:opacity-70',
                        option.id === activeFilter ? '' : 'hidden sm:inline',
                      )}
                    >
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
          className="flex min-h-0 flex-1 flex-col px-0 pb-6 sm:px-4 md:px-6 lg:px-8"
          size="content"
        >
          <div className="overflow-hidden border-y border-border bg-background sm:rounded-card sm:border sm:bg-surface">
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
