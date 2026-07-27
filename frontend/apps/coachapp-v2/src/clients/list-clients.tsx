import {Button} from '@heroui/react';
import {ArrowUpDown, UserPlus} from 'lucide-react';
import {useDeferredValue, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseScreen from '@/@components/browse-screen';
import ListEmptyState from '@/@components/list-empty-state';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {
  type Client,
  type ClientStatus,
  type ClientSummary,
  useClientsInfiniteQuery,
  useListAttentionClientsQuery,
  useListClientsQuery,
} from '@/api/clients';

import ClientListItem from './clients-list/client-list-item';

type FilterId = 'active' | 'all' | 'attention' | 'inactive' | 'invited';

type FilterOption = {
  id: FilterId;
  /** COPY.md §CL gives shorter labels for the mobile pill row. */
  label: string;
  shortLabel: string;
  status?: ClientStatus;
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
  // Two orders, as the design's control offers: the endpoint's default (newest
  // first) and the client's own last activity.
  const [sort, setSort] = useState<'last_active' | 'newest'>('newest');

  const deferredSearch = useDeferredValue(search);
  const isAttention = activeFilter === 'attention';
  const activeStatus = FILTER_OPTIONS.find((option) => option.id === activeFilter)?.status;

  const list = useInfiniteItems(
    useClientsInfiniteQuery({search: deferredSearch, sort, status: activeStatus}, {enabled: !isAttention}),
  );
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

  const items: Client[] = isAttention ? attentionClients : list.items;
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
    <BrowseScreen
      action={{icon: <UserPlus />, label: 'Invite client', to: ROUTES.INVITE_CLIENT}}
      description={
        summaryData
          ? `${summaryData.summary.active} active \u00b7 ${summaryData.summary.pending} invited`
          : 'Your coaching roster'
      }
      empty={
        <ListEmptyState
          createLabel="Invite Client"
          createRoute={ROUTES.INVITE_CLIENT}
          emptyDescription="Invite your first client to get started."
          filterDescription="Try adjusting your search or filter to find what you're looking for."
          hasFilter={hasFilter}
          nounPlural="clients"
          onClearFilters={clearFilters}
        />
      }
      filters={{
        onSelect: setActiveFilter,
        options: FILTER_OPTIONS.map((option) => ({...option, count: getCount(option)})),
        selected: activeFilter,
      }}
      onOpen={(key) => navigate(ROUTES.CLIENT_DETAIL.replace(':id', String(key)))}
      query={{
        // "Needs attention" is a different endpoint: flat, no search param, so
        // it exposes no fetchNextPage and BrowseScreen renders no load-more.
        fetchNextPage: isAttention ? undefined : list.fetchNextPage,
        isError: isAttention ? attention.isError : list.isError,
        isLoading: isAttention ? attention.isLoading : list.isLoading || list.isFetchingNextPage,
        items,
        refetch: isAttention ? attention.refetch : list.refetch,
      }}
      row={(client) => <ClientListItem client={client} />}
      rowHasThumb
      search={{onChange: setSearch, placeholder: 'Search clients', value: search}}
      title="Clients"
      toolbarEnd={
        isAttention ? null : (
          <Button
            className="button--row gap-1.5 type-eyebrow text-muted"
            onPress={() => setSort((current) => (current === 'last_active' ? 'newest' : 'last_active'))}
            variant="ghost"
          >
            <ArrowUpDown className="size-3.5" />
            {sort === 'last_active' ? 'Last active' : 'Newest'}
          </Button>
        )
      }
    />
  );
}
