import {getInitials} from '@easy/utils';
import {ClipboardCheck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {useCheckInsQueueInfiniteQuery, type WorkbenchCheckInQueueItem} from '@/api/workbench';
import {ROUTES} from '@/routes';
import BrowseListBox from '@/ui/browse-list-box';
import {EmptyState} from '@/ui/empty-state';
import {useInfiniteItems} from '@/ui/use-infinite-items';
import {requirePrimaryReason} from '@/workbench/programming';
import {QueueRow} from '@/workbench/queue-row';
import {presentCheckInReason} from '@/workbench/reason-presentation';

export default function CheckInsView() {
  const navigate = useNavigate();
  const list = useInfiniteItems(useCheckInsQueueInfiniteQuery());

  const openReview = (item: WorkbenchCheckInQueueItem) =>
    navigate(ROUTES.CHECKIN_REVIEW.replace(':id', item.submission.id));

  const toRow = (item: WorkbenchCheckInQueueItem) => {
    const reason = requirePrimaryReason(item.reasons);
    const presented = presentCheckInReason(reason);
    return {
      action: presented.action,
      id: item.submission.id,
      initials: getInitials(item.client.first_name, item.client.last_name) || '?',
      name: [item.client.first_name, item.client.last_name].filter(Boolean).join(' ') || item.client.email || 'Client',
      onAction: () => openReview(item),
      onOpen: () => openReview(item),
      subtitle: `${presented.title} · ${presented.description}`,
      tone: 'accent' as const,
    };
  };

  return (
    <BrowseListBox
      ariaLabel="Check-ins to review"
      className="flex-1 gap-0 p-0"
      emptyState={
        <EmptyState
          body="Client check-ins land here when they're submitted, oldest first, until you review them."
          icon={ClipboardCheck}
          title="All reviewed. Nothing waiting on you."
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
          key={item.submission.id}
        />
      )}
      skeletonAvatar
    />
  );
}
