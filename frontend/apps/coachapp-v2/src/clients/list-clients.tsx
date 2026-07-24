import {UserPlus} from 'lucide-react';
import {useDeferredValue, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseScreen from '@/@components/browse-screen';
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
    <BrowseScreen
      action={{icon: <UserPlus className="size-4" />, label: 'Invite client', to: ROUTES.INVITE_CLIENT}}
      description={
        summaryData
          ? `${summaryData.summary.active} active \u00b7 ${summaryData.summary.pending} invited`
          : 'Your coaching roster'
      }
      empty={
        <ClientEmptyState
          hasFilter={hasFilter}
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
    />
  );
}
