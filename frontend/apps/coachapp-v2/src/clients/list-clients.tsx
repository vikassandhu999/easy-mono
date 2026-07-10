import type {Key} from '@heroui/react';

import {Button, SearchField, Tabs} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useDeferredValue, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox from '@/@components/browse-list-box';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {type ClientSummary, type ListClientsFilters, useListClientsQuery} from '@/api/clients';
import {useListCoachConversationsQuery} from '@/api/conversations';

import ClientEmptyState from './clients-list/client-empty-state';
import ClientListItem from './clients-list/client-list-item';
import useClientsSearch from './clients-list/use-clients-search';

type FilterOption = {
  id: string;
  label: string;
  filter: ListClientsFilters;
  summaryKey?: keyof ClientSummary;
};

const FILTER_OPTIONS: FilterOption[] = [
  {id: 'all', label: 'All', filter: {}},
  {id: 'active', label: 'Active', filter: {status: 'active'}, summaryKey: 'active'},
  {id: 'invited', label: 'Invited', filter: {status: 'pending'}, summaryKey: 'pending'},
  {id: 'inactive', label: 'Inactive', filter: {status: 'inactive'}, summaryKey: 'inactive'},
];

function getOptionCount(
  option: FilterOption,
  summaryData: {count: number; summary: ClientSummary} | undefined,
): number | string {
  if (!summaryData) {
    return '...';
  }
  if (!option.summaryKey) {
    return summaryData.count;
  }
  return summaryData.summary[option.summaryKey];
}

export default function ListClients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<Key>('all');

  const deferredSearch = useDeferredValue(search);
  const activeStatus = FILTER_OPTIONS.find((o) => o.id === activeFilter)?.filter.status;
  const {clients, fetchNextPage, isLoading} = useClientsSearch({search: deferredSearch, status: activeStatus});

  // limit: 0 returns the summary aggregate with no rows — the backend clamps to min(max(limit, 0), 100).
  const {data: summaryData} = useListClientsQuery({limit: 0});
  // ponytail: 100 is the backend's max page. Rows for clients whose conversation falls past it
  // show no unread badge. Fold unread_count into the client list response if that becomes reachable.
  const {data: conversationsData} = useListCoachConversationsQuery({limit: 100});

  const unreadByClientId = useMemo(() => {
    const unread = new Map<string, number>();
    for (const conversation of conversationsData?.data ?? []) {
      unread.set(conversation.client_id, conversation.unread_count);
    }
    return unread;
  }, [conversationsData]);

  function clearFilters() {
    setSearch('');
    setActiveFilter('all');
  }

  const totalCount = summaryData?.count ?? '...';
  const activeCount = summaryData?.summary.active ?? '...';
  const hasFilter = !!deferredSearch || activeFilter !== 'all';

  return (
    <Page className="bg-surface">
      <Page.Header className="items-end gap-4 px-4 pt-6 pb-0 md:px-8 md:pt-8 lg:px-10">
        <Page.TitleGroup>
          <p className="mb-2 text-xs font-semibold tracking-wider text-accent uppercase">Your roster</p>
          <Page.Title className="font-grotesk text-4xl leading-none tracking-normal">Clients</Page.Title>
          <p className="mt-3 text-sm text-muted">
            <span className="font-semibold text-foreground">{totalCount}</span> total ·{' '}
            <span className="font-semibold text-success-soft-foreground">{activeCount}</span> active
          </p>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            className="min-h-11 bg-accent px-4 font-semibold text-accent-foreground hover:bg-accent-hover"
            onPress={() => navigate(ROUTES.INVITE_CLIENT)}
          >
            <Plus size={16} />
            Invite
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Toolbar className="sticky top-0 z-10 flex flex-col gap-3 border-b border-surface-secondary bg-surface px-4 pt-6 pb-4 md:px-8 lg:flex-row lg:items-center lg:px-10">
        <SearchField
          aria-label="Search clients"
          className="w-full lg:max-w-70"
          onChange={setSearch}
          value={search}
          variant={'secondary'}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search clients" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Tabs
          aria-label="Filter clients by status"
          className="min-w-0 flex-1"
          onSelectionChange={setActiveFilter}
          selectedKey={activeFilter}
        >
          <Tabs.ListContainer className="scrollbar-hide max-w-full overflow-x-auto">
            <Tabs.List className="w-max! min-w-max gap-2 bg-transparent p-0">
              {FILTER_OPTIONS.map((option) => (
                <Tabs.Tab
                  className="group h-9 w-auto! gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-semibold text-muted data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  id={option.id}
                  key={option.id}
                >
                  {option.label}
                  <span className="rounded-full bg-surface-secondary px-1.5 py-0.5 text-xs font-bold text-muted group-data-[selected=true]:bg-accent-foreground/15 group-data-[selected=true]:text-accent-foreground">
                    {getOptionCount(option, summaryData)}
                  </span>
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </Page.Toolbar>
      <Page.Content className="px-4 pb-8 md:px-8 lg:px-10">
        <BrowseListBox
          ariaLabel="Clients"
          className="flex-1 overflow-hidden rounded-2xl border-[1.5px] border-separator bg-surface p-0"
          emptyState={
            <ClientEmptyState
              hasFilter={hasFilter}
              onClearFilters={clearFilters}
            />
          }
          fetchNextPage={fetchNextPage}
          isLoading={isLoading}
          items={clients}
          onAction={(key) => navigate(ROUTES.CLIENT_DETAIL.replace(':id', String(key)))}
          renderItem={(client) => (
            <ClientListItem
              client={client}
              unreadCount={unreadByClientId.get(client.id) ?? 0}
            />
          )}
          skeletonAvatar
        />
      </Page.Content>
    </Page>
  );
}
