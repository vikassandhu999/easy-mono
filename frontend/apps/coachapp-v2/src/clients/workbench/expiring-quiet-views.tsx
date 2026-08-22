import {getInitials} from '@easy/utils';
import {CalendarClock, Moon} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {
  useExpiringQueueInfiniteQuery,
  useQuietQueueInfiniteQuery,
  type WorkbenchExpiringQueueItem,
  type WorkbenchQuietQueueItem,
} from '@/api/workbench';
import {requirePrimaryReason} from '@/clients/workbench-programming';
import {presentExpiringReason, presentQuietReason} from '@/clients/workbench-reason-presentation';
import {ROUTES} from '@/routes';
import BrowseListBox from '@/ui/browse-list-box';
import {EmptyState} from '@/ui/empty-state';
import {useInfiniteItems} from '@/ui/use-infinite-items';

import {QueueRow} from './queue-row';
import {SnoozeMenu} from './snooze-menu';

function nameFromClient(client: {email: null | string; first_name: null | string; last_name: null | string}) {
  return [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email || 'Client';
}

export function ExpiringView() {
  const navigate = useNavigate();
  const list = useInfiniteItems(useExpiringQueueInfiniteQuery());

  const toRow = (item: WorkbenchExpiringQueueItem) => {
    const reason = requirePrimaryReason(item.reasons);
    const presented = presentExpiringReason(reason);
    return {
      action: presented.action,
      id: item.client.id,
      initials: getInitials(item.client.first_name, item.client.last_name) || '?',
      name: nameFromClient(item.client),
      onAction: () => navigate(`${ROUTES.CLIENT_DETAIL.replace(':id', item.client.id)}?manage=access`),
      onOpen: () => navigate(ROUTES.CLIENT_DETAIL.replace(':id', item.client.id)),
      subtitle: `${presented.title} · ${presented.description}`,
      tone: 'danger' as const,
      trailing: (
        <SnoozeMenu
          clientId={item.client.id}
          queue="expiring"
        />
      ),
    };
  };

  return (
    <BrowseListBox
      ariaLabel="Expiring queue"
      className="flex-1 gap-0 p-0"
      emptyState={
        <EmptyState
          body="Clients appear here when their engagement ends within 14 days."
          icon={CalendarClock}
          title="No renewals due in the next 14 days"
        />
      }
      fetchNextPage={list.fetchNextPage}
      grid
      isError={list.isError}
      isLoading={list.isLoading || list.isFetchingNextPage}
      items={list.items}
      onRetry={list.refetch}
      renderItem={(item) => (
        <QueueRow
          item={toRow(item)}
          key={item.client.id}
        />
      )}
      skeletonAvatar
    />
  );
}

export function QuietView() {
  const navigate = useNavigate();
  const list = useInfiniteItems(useQuietQueueInfiniteQuery());

  const toRow = (item: WorkbenchQuietQueueItem) => {
    const reason = requirePrimaryReason(item.reasons);
    const presented = presentQuietReason(reason);
    return {
      action: presented.action,
      id: item.client.id,
      initials: getInitials(item.client.first_name, item.client.last_name) || '?',
      name: nameFromClient(item.client),
      onAction: () => navigate(ROUTES.CLIENT_MESSAGES.replace(':id', item.client.id)),
      onOpen: () => navigate(ROUTES.CLIENT_DETAIL.replace(':id', item.client.id)),
      subtitle: `${presented.title} · ${presented.description}`,
      tone: 'danger' as const,
      trailing: (
        <SnoozeMenu
          clientId={item.client.id}
          queue="quiet"
        />
      ),
    };
  };

  return (
    <BrowseListBox
      ariaLabel="Quiet queue"
      className="flex-1 gap-0 p-0"
      emptyState={
        <EmptyState
          body="Clients appear here after missing an already-due check-in."
          icon={Moon}
          title="No one's gone quiet"
        />
      }
      fetchNextPage={list.fetchNextPage}
      grid
      isError={list.isError}
      isLoading={list.isLoading || list.isFetchingNextPage}
      items={list.items}
      onRetry={list.refetch}
      renderItem={(item) => (
        <QueueRow
          item={toRow(item)}
          key={item.client.id}
        />
      )}
      skeletonAvatar
    />
  );
}
