import type {Key} from '@heroui/react';

import {Button, SearchField, Tabs} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox from '@/@components/browse-list-box';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {type ClientSummary, type ListClientsFilters, useListClientsQuery} from '@/api/clients';

import ClientEmptyState from './clients-list/client-empty-state';
import ClientListItem from './clients-list/client-list-item';
import useClientsSearch from './clients-list/use-clients-search';

type FilterOption = {
  id: string;
  label: string;
  filter: ListClientsFilters;
  summaryKey?: string;
};

const FILTER_OPTIONS: FilterOption[] = [
  {id: 'all', label: 'All', filter: {}},
  {id: 'active', label: 'Active', filter: {status: 'active'}, summaryKey: 'active'},
  {id: 'pending', label: 'Pending', filter: {status: 'pending'}, summaryKey: 'pending'},
  {id: 'inactive', label: 'Inactive', filter: {status: 'inactive'}, summaryKey: 'inactive'},
  {id: 'archived', label: 'Archived', filter: {status: 'archived'}, summaryKey: 'archived'},
];

function getOptionLabel(option: FilterOption, summary: ClientSummary | undefined): string {
  if (!summary || !option.summaryKey) {
    return option.label;
  }
  const count = (summary as Record<string, number>)[option.summaryKey];
  return count ? `${option.label} (${count})` : option.label;
}

export default function ListClients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<Key>('all');

  const deferredSearch = useDeferredValue(search);
  const activeStatus = FILTER_OPTIONS.find((o) => o.id === activeFilter)?.filter.status;
  const {clients, fetchNextPage, isLoading} = useClientsSearch({search: deferredSearch, status: activeStatus});

  const {data: summaryData} = useListClientsQuery({limit: 0});

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup>
          <Page.Title>Clients</Page.Title>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            onPress={() => navigate(ROUTES.INVITE_CLIENT)}
            size="sm"
          >
            <Plus size={16} />
            Invite
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Toolbar className={'sticky top-0 z-10 flex flex-col gap-3 pt-2 pb-3 border-b bg-surface'}>
        <SearchField
          aria-label="Search clients"
          className="w-full sm:max-w-xs"
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
            <Tabs.List className="w-max! min-w-max">
              {FILTER_OPTIONS.map((option) => (
                <Tabs.Tab
                  className="w-auto! h-8 whitespace-nowrap data-[selected=true]:bg-segment data-[selected=true]:text-segment-foreground data-[selected=true]:shadow-sm sm:h-6"
                  id={option.id}
                  key={option.id}
                >
                  {getOptionLabel(option, summaryData?.summary)}
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
          emptyState={<ClientEmptyState hasFilter={!!deferredSearch || activeFilter !== 'all'} />}
          fetchNextPage={fetchNextPage}
          isLoading={isLoading}
          items={clients}
          onAction={(key) => navigate(ROUTES.CLIENT_DETAIL.replace(':id', String(key)))}
          renderItem={(client) => <ClientListItem client={client} />}
          skeletonAvatar
        />
      </Page.Content>
    </Page>
  );
}
