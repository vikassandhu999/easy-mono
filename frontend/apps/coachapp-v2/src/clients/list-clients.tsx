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

import ClientAttentionPopover from './clients-list/client-attention-popover';
import ClientEmptyState from './clients-list/client-empty-state';
import ClientListItem from './clients-list/client-list-item';
import useClientsSearch from './clients-list/use-clients-search';

type FilterOption = {
  filter: ListClientsFilters;
  id: string;
  label: string;
  summaryKey?: keyof ClientSummary;
};

const FILTER_OPTIONS: FilterOption[] = [
  {id: 'all', label: 'All', filter: {}},
  {id: 'active', label: 'Active', filter: {status: 'active'}, summaryKey: 'active'},
  {id: 'invited', label: 'Invited', filter: {status: 'pending'}, summaryKey: 'pending'},
  {id: 'inactive', label: 'Inactive', filter: {status: 'inactive'}, summaryKey: 'inactive'},
];

function getOptionCount(option: FilterOption, data: {count: number; summary: ClientSummary} | undefined) {
  if (!data) {
    return undefined;
  }

  return option.summaryKey ? data.summary[option.summaryKey] : data.count;
}

export default function ListClients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<Key>('all');

  const deferredSearch = useDeferredValue(search);
  const activeStatus = FILTER_OPTIONS.find((option) => option.id === activeFilter)?.filter.status;
  const {clients, fetchNextPage, isError, isFetchingNextPage, isLoading, refetch} = useClientsSearch({
    search: deferredSearch,
    status: activeStatus,
  });
  const {data: summaryData} = useListClientsQuery({limit: 0});
  // ponytail: 100 is the backend's max page. Fold unread_count into the client
  // list response if coaches can reach more conversations than this.
  const {data: conversationsData} = useListCoachConversationsQuery({limit: 100});

  const unreadByClientId = useMemo(() => {
    const unread = new Map<string, number>();
    for (const conversation of conversationsData?.data ?? []) {
      unread.set(conversation.client_id, conversation.unread_count);
    }
    return unread;
  }, [conversationsData]);

  const hasFilter = !!deferredSearch || activeFilter !== 'all';
  const clearFilters = () => {
    setSearch('');
    setActiveFilter('all');
  };

  return (
    <Page>
      <Page.Header size="list">
        <Page.TitleGroup>
          <Page.Title>Clients</Page.Title>
          <Page.Description>
            {summaryData ? `${summaryData.summary.active} active · ${summaryData.count} total` : 'Your coaching roster'}
          </Page.Description>
        </Page.TitleGroup>
        <Page.Actions>
          <ClientAttentionPopover />
          <Button
            className="min-h-11"
            onPress={() => navigate(ROUTES.INVITE_CLIENT)}
            size="sm"
          >
            <Plus size={16} />
            Invite
          </Button>
        </Page.Actions>
      </Page.Header>

      <Page.Toolbar
        className="sticky top-0 z-10 mb-4 flex flex-col gap-3 bg-background/95 pb-3 pt-2 backdrop-blur md:flex-row md:items-end md:justify-between"
        size="list"
      >
        <SearchField
          aria-label="Search clients"
          className="w-full md:w-80 md:shrink-0"
          onChange={setSearch}
          value={search}
        >
          <SearchField.Group className="min-h-11">
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search clients" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Tabs
          aria-label="Filter clients by status"
          className="min-w-0 md:ms-auto md:flex-none"
          onSelectionChange={setActiveFilter}
          selectedKey={activeFilter}
          variant="secondary"
        >
          <Tabs.ListContainer className="scrollbar-hide max-w-full overflow-x-auto">
            <Tabs.List className="w-max! min-w-max">
              {FILTER_OPTIONS.map((option) => {
                const count = getOptionCount(option, summaryData);

                return (
                  <Tabs.Tab
                    className="min-h-11 w-auto! gap-2 whitespace-nowrap px-3 sm:px-4"
                    id={option.id}
                    key={option.id}
                  >
                    <span>{option.label}</span>
                    {count === undefined ? null : (
                      <span className="hidden text-xs font-normal text-muted sm:inline">{count}</span>
                    )}
                    <Tabs.Indicator className="bg-current" />
                  </Tabs.Tab>
                );
              })}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </Page.Toolbar>

      <Page.Content>
        <Page.Frame
          className="flex min-h-0 flex-1 flex-col pb-6"
          size="list"
        >
          <BrowseListBox
            ariaLabel="Clients"
            className="flex-1 gap-0 overflow-hidden rounded-2xl border border-border bg-surface"
            emptyState={
              <ClientEmptyState
                hasFilter={hasFilter}
                onClearFilters={clearFilters}
              />
            }
            fetchNextPage={fetchNextPage}
            isError={isError}
            isLoading={isLoading || isFetchingNextPage}
            items={clients}
            onAction={(key) => navigate(ROUTES.CLIENT_DETAIL.replace(':id', String(key)))}
            onRetry={refetch}
            renderItem={(client) => (
              <ClientListItem
                client={client}
                unreadCount={unreadByClientId.get(client.id) ?? 0}
              />
            )}
            skeletonAvatar
          />
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
