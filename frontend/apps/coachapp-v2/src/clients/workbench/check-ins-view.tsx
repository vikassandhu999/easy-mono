import {getInitials} from '@easy/utils';
import {ClipboardCheck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox from '@/@components/browse-list-box';
import {EmptyState} from '@/@components/empty-state';
import {ROUTES} from '@/@config/routes';
import {type ClientProfileReviewQueueItem, useListCheckInReviewQueueQuery} from '@/api/checkins';
import {formatRelativeTime} from '@/dashboard/lib/date-format';

import {QueueRow} from './queue-row';

/** The endpoint is oldest-first (longest-waiting on top) and this pane is a working queue, not a browse list. */
const PAGE = 20;

export default function CheckInsView() {
  const navigate = useNavigate();
  const {data, isError, isLoading, refetch} = useListCheckInReviewQueueQuery({limit: PAGE, offset: 0});
  const items = data?.data ?? [];

  const openReview = (id: string) => navigate(ROUTES.CHECKIN_REVIEW.replace(':id', id));

  const toRow = (item: ClientProfileReviewQueueItem) => ({
    action: 'Review',
    id: item.id,
    initials: getInitials(item.client.first_name, item.client.last_name) || '?',
    name: [item.client.first_name, item.client.last_name].filter(Boolean).join(' ') || item.client.email || 'Client',
    onAction: () => openReview(item.id),
    onOpen: () => openReview(item.id),
    subtitle: `Submitted ${formatRelativeTime(item.inserted_at)}`,
    tone: 'accent' as const,
  });

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
      grid
      fetchNextPage={() => undefined}
      isError={isError}
      isLoading={isLoading}
      items={items}
      onRetry={refetch}
      renderItem={(item) => (
        <QueueRow
          item={toRow(item)}
          key={item.id}
        />
      )}
      skeletonAvatar
    />
  );
}
