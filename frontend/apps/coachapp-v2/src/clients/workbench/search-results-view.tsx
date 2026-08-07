import {useNavigate} from 'react-router-dom';

import BrowseListBox from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useClientsInfiniteQuery} from '@/api/clients';
import ClientListItem from '@/clients/clients-list/client-list-item';

import {ViewShell} from './view-shell';

/**
 * The pane shown while the workbench search field has a query. It searches
 * the WHOLE roster, whatever queue is selected — the search field is the
 * roster's front door now that All clients left the rail (the roster view
 * itself survives as the counts-error fallback and the caught-up pane's
 * "View all clients" target).
 */
export default function SearchResultsView({onClear, search}: {onClear: () => void; search: string}) {
  const navigate = useNavigate();
  const list = useInfiniteItems(useClientsInfiniteQuery({search}));

  return (
    <ViewShell
      meta="Across all clients"
      title="Search results"
    >
      <BrowseListBox
        ariaLabel="Search results"
        className="flex-1 gap-0 p-0"
        emptyState={
          <ListEmptyState
            emptyDescription="No clients match your search."
            filterDescription="No clients match your search."
            hasFilter
            nounPlural="clients"
            onClearFilters={onClear}
          />
        }
        fetchNextPage={list.fetchNextPage}
        isError={list.isError}
        isLoading={list.isLoading || list.isFetchingNextPage}
        items={list.items}
        onAction={(key) => navigate(ROUTES.CLIENT_DETAIL.replace(':id', String(key)))}
        onRetry={list.refetch}
        renderItem={(client) => (
          <ClientListItem
            client={client}
            key={client.id}
          />
        )}
        skeletonAvatar
      />
    </ViewShell>
  );
}
