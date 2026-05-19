import type {Key} from '@heroui/react';

import {Button, SearchField, Tabs} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {type ClientSummary, type ListClientsFilters, useListClientsQuery} from '@/api/clients';

import ClientsList from './components/clients-list';

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
  if (!summary || !option.summaryKey) return option.label;
  const count = (summary as Record<string, number>)[option.summaryKey];
  return count ? `${option.label} (${count})` : option.label;
}

export default function ListClients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<Key>('all');

  const debouncedSearch = useDebouncedValue(search);

  const {data: summaryData} = useListClientsQuery({limit: 0});

  return (
    <Page>
      <Page.Header className={'pt-4 pb-2'}>
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
      <Page.Toolbar
        className={
          'sticky top-0 z-10 flex shrink-0 flex-col gap-3 bg-background pt-2 pb-3 backdrop-blur after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-divider after:opacity-0 after:shadow-sm after:transition-opacity group-data-[scrolled=true]/page:after:opacity-100 supports-[backdrop-filter]:bg-background/80'
        }
      >
        <SearchField
          aria-label="Search clients"
          className="w-full sm:max-w-xs"
          onChange={setSearch}
          value={search}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search clients..." />
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
            <Tabs.List className="!w-max min-w-max">
              {FILTER_OPTIONS.map((option) => (
                <Tabs.Tab
                  className="!w-auto h-6 whitespace-nowrap data-[selected=true]:bg-segment data-[selected=true]:text-segment-foreground data-[selected=true]:shadow-sm"
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
        <ClientsList
          hasFilter={!!debouncedSearch || activeFilter !== 'all'}
          search={debouncedSearch}
          status={FILTER_OPTIONS.find((o) => o.id === activeFilter)?.filter.status}
        />
      </Page.Content>
    </Page>
  );
}
