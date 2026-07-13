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

function getOptionLabel(option: FilterOption, data: {count: number; summary: ClientSummary} | undefined): string {
  if (!data) {
    return option.label;
  }

  const count = option.summaryKey ? data.summary[option.summaryKey] : data.count;
  return `${option.label} (${count})`;
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
      <Page.Header>
        <Page.TitleGroup>
          <Page.Title>Clients</Page.Title>
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

      <Page.Toolbar className="sticky top-0 z-10 flex flex-col gap-3 border-b bg-surface pb-3 pt-2">
        <SearchField
          aria-label="Search clients"
          className="w-full sm:max-w-xs"
          onChange={setSearch}
          value={search}
          variant="secondary"
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
            <Tabs.List className="w-max! min-w-max">
              {FILTER_OPTIONS.map((option) => (
                <Tabs.Tab
                  className="min-h-11 w-auto! whitespace-nowrap data-[selected=true]:bg-segment data-[selected=true]:text-segment-foreground data-[selected=true]:shadow-sm"
                  id={option.id}
                  key={option.id}
                >
                  {getOptionLabel(option, summaryData)}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </Page.Toolbar>

      <Page.Content>
        <BrowseListBox
          ariaLabel="Clients"
          className="flex-1 gap-0"
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
      </Page.Content>
    </Page>
  );
}
