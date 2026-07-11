import type {Key} from '@heroui/react';

import {Button, SearchField, Tabs} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useDeferredValue, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox from '@/@components/browse-list-box';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {type ClientSummary, type ListClientsFilters, useListClientsQuery} from '@/api/clients';
import {useListCoachConversationsQuery} from '@/api/conversations';
import ClientAttentionPopover from './clients-list/client-attention-popover';
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
  const isDesktop = useIsDesktop();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<Key>('all');

  const deferredSearch = useDeferredValue(search);
  const activeStatus = FILTER_OPTIONS.find((o) => o.id === activeFilter)?.filter.status;
  const {clients, fetchNextPage, isError, isFetchingNextPage, isLoading, refetch} = useClientsSearch({
    search: deferredSearch,
    status: activeStatus,
  });

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

  function openClient(key: Key) {
    const route = isDesktop ? ROUTES.CLIENT_MESSAGES : ROUTES.CLIENT_DETAIL;
    navigate(route.replace(':id', String(key)));
  }

  const totalCount = summaryData?.count ?? '...';
  const activeCount = summaryData?.summary.active ?? '...';
  const hasFilter = !!deferredSearch || activeFilter !== 'all';
  const showEmptyState = !isLoading && !isFetchingNextPage && !isError && clients.length === 0;
  return (
    <Page className="bg-surface">
      <Page.Header className="items-end gap-6 px-[18px] pt-2 pb-0! md:px-10 md:pt-[34px] lg:px-10 lg:pt-[34px]">
        <Page.TitleGroup>
          <p className="mb-[5px] text-[11px] font-semibold tracking-[0.08em] text-focus uppercase md:mb-2 md:text-xs">
            Your roster
          </p>
          <Page.Title className="font-grotesk text-[26px]! leading-none! font-bold! tracking-[-0.02em]! md:text-[34px]!">
            Clients
          </Page.Title>
          <Page.Description className="mt-[11px] hidden leading-[21px] md:block">
            <span className="font-bold text-foreground">{totalCount}</span> total ·{' '}
            <span className="font-bold text-success">{activeCount}</span> active · showing{' '}
            <span className="font-bold text-foreground">{clients.length}</span>
          </Page.Description>
        </Page.TitleGroup>
        <Page.Actions className="gap-0 md:gap-2.5">
          <ClientAttentionPopover />
          <Button
            className="h-11 min-h-11 w-11 min-w-11 justify-end! rounded-[12px]! bg-transparent! p-0! text-[13.5px] text-accent-foreground! hover:bg-transparent! md:w-auto md:min-w-0 md:justify-center! md:rounded-[13px]! md:bg-accent! md:px-[18px]! md:py-3! md:hover:bg-accent!"
            onPress={() => navigate(ROUTES.INVITE_CLIENT)}
            variant="primary"
          >
            <span
              aria-hidden
              className="grid size-10 place-items-center rounded-[12px] bg-accent md:contents"
            >
              <Plus
                className="size-[18px]! md:size-[17px]!"
                size={17}
                strokeWidth={2.4}
              />
            </span>
            <span className="sr-only md:not-sr-only">Invite</span>
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Content className="px-[18px] pb-6 md:px-10 md:pb-10">
        <div className="flex min-h-0 flex-1 flex-col pt-4 md:pt-[22px]">
          <div className="mb-4 flex flex-col gap-3.5 sm:mb-[18px] sm:flex-row sm:items-center">
            <SearchField
              aria-label="Search clients"
              className="w-full sm:w-[280px] sm:shrink-0"
              onChange={setSearch}
              value={search}
              variant="secondary"
            >
              <SearchField.Group className="h-11 min-h-11 gap-[9px] rounded-[12px] border-[1.5px]! border-separator bg-surface">
                <SearchField.SearchIcon className="size-4 shrink-0 text-field-placeholder sm:size-[17px]" />
                <SearchField.Input
                  className="p-0 text-[13.5px] text-foreground placeholder:text-field-placeholder sm:text-sm"
                  placeholder="Search clients"
                />
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
                <Tabs.List className="w-max! min-w-max gap-[7px] bg-transparent p-0 sm:gap-2">
                  {FILTER_OPTIONS.map((option) => (
                    <Tabs.Tab
                      className="group h-8 min-w-fit gap-1.5 whitespace-nowrap rounded-[9px] bg-surface-secondary px-[13px] text-[12.5px] font-semibold text-muted data-[selected=true]:bg-accent! data-[selected=true]:text-accent-foreground! sm:h-9 sm:gap-[7px] sm:rounded-[10px] sm:px-[15px] sm:text-[13px]"
                      id={option.id}
                      key={option.id}
                    >
                      {option.label}
                      <span className="min-w-[15px] rounded-full bg-border px-[5px] text-center text-[10.5px] leading-[15px] font-bold text-muted group-data-[selected=true]:bg-accent-foreground/[0.22]! group-data-[selected=true]:text-accent-foreground! sm:min-w-4 sm:px-1.5 sm:text-[11px] sm:leading-4">
                        {getOptionCount(option, summaryData)}
                      </span>
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>
          </div>
          <BrowseListBox
            ariaLabel="Clients"
            className={`flex-1 overflow-hidden rounded-[16px] bg-surface p-0 sm:rounded-[18px] ${
              showEmptyState ? 'border-0!' : 'border-[1.5px]! border-separator'
            }`}
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
            onAction={openClient}
            onRetry={refetch}
            renderItem={(client) => (
              <ClientListItem
                client={client}
                unreadCount={unreadByClientId.get(client.id) ?? 0}
              />
            )}
            skeletonAvatar
          />
        </div>
      </Page.Content>
    </Page>
  );
}
