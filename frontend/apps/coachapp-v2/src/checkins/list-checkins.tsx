import {formatIsoDateOnly} from '@easy/utils';
import {Button, Chip, Typography} from '@heroui/react';
import {ClipboardCheck, UserRoundCheck} from 'lucide-react';
import {useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';

import ListEmptyState from '@/@components/list-empty-state';
import {ListSkeleton} from '@/@components/list-skeleton';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {
  type ClientProfileReviewQueueItem,
  useListCheckInReviewQueueQuery,
  useListFormTemplatesQuery,
} from '@/api/checkins';
import SectionPage, {filterChip, SectionHeader} from '@/library/components/section-page';
import {formTemplateItem} from '@/library/lib/builder-items';

function reviewClientName(item: ClientProfileReviewQueueItem): string {
  return [item.client.first_name, item.client.last_name].filter(Boolean).join(' ') || 'Client';
}

function ReviewQueue() {
  const navigate = useNavigate();
  const {data, isError, isLoading, refetch} = useListCheckInReviewQueueQuery();
  const items = data?.data ?? [];

  if (isLoading) {
    return <ListSkeleton />;
  }
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <Typography
          color="muted"
          type="body-sm"
        >
          Couldn't load check-ins to review.
        </Typography>
        <Button
          onPress={() => refetch()}
          size="sm"
          variant="secondary"
        >
          Retry
        </Button>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="rounded-[16px] border border-separator bg-surface p-8 text-center">
        <UserRoundCheck
          className="mx-auto text-success"
          size={28}
        />
        <Typography
          className="mt-3"
          type="body-sm"
          weight="semibold"
        >
          All caught up
        </Typography>
        <Typography
          className="mt-1"
          color="muted"
          type="body-xs"
        >
          Submitted check-ins will appear here.
        </Typography>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <button
          className="flex min-h-14 items-center gap-3 rounded-[14px] border border-separator bg-surface p-4 text-left transition-colors hover:bg-surface-hover"
          key={item.id}
          onClick={() => navigate(ROUTES.CHECKIN_REVIEW.replace(':id', item.id))}
          type="button"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-warning-soft text-warning-soft-foreground">
            <ClipboardCheck size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <Typography
              truncate
              type="body-sm"
              weight="semibold"
            >
              {reviewClientName(item)}
            </Typography>
            <Typography
              color="muted"
              type="body-xs"
            >
              {item.form_assignment.form_template.name} · {formatIsoDateOnly(item.submitted_at)}
            </Typography>
          </span>
          <Chip
            size="sm"
            variant="soft"
          >
            Review
          </Chip>
        </button>
      ))}
    </div>
  );
}

const PURPOSES = [
  ['all', 'All'],
  ['intake', 'Intake'],
  ['check_in', 'Check-in'],
] as const;

export default function ListCheckins() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [purpose, setPurpose] = useState<'all' | 'check_in' | 'intake'>('all');
  const {data, isError, isLoading, refetch} = useListFormTemplatesQuery();
  const {data: reviewData} = useListCheckInReviewQueueQuery();
  const onReview = searchParams.get('tab') === 'review';
  const reviewCount = reviewData?.data.length;

  const templates = data?.data ?? [];
  const q = search.trim().toLowerCase();
  const items = templates
    .filter((t) => purpose === 'all' || t.purpose === purpose)
    .map(formTemplateItem)
    .filter((t) => !q || t.name.toLowerCase().includes(q));

  const chips = (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {PURPOSES.map(([id, label]) => (
        <button
          className={filterChip(!onReview && purpose === id)}
          key={id}
          onClick={() => {
            setPurpose(id);
            if (onReview) {
              setSearchParams({}, {replace: true});
            }
          }}
          type="button"
        >
          {label}
        </button>
      ))}
      <span className="my-1.5 w-px shrink-0 bg-separator" />
      <button
        className={filterChip(onReview)}
        onClick={() => setSearchParams({tab: 'review'}, {replace: true})}
        type="button"
      >
        To review{reviewCount != null ? ` (${reviewCount})` : ''}
      </button>
    </div>
  );

  if (onReview) {
    return (
      <Page className="bg-surface">
        <SectionHeader typeKey="forms" />
        <Page.Content className="px-[18px] pb-10 md:px-9">
          <div className="mt-4 md:mt-5">{chips}</div>
          <div className="mt-5">
            <ReviewQueue />
          </div>
        </Page.Content>
      </Page>
    );
  }

  return (
    <SectionPage
      count={templates.length}
      emptyState={
        <ListEmptyState
          createLabel="Create form"
          createRoute={ROUTES.CREATE_CHECKIN}
          emptyDescription="Build intake and check-in forms for your clients."
          filterDescription="Try adjusting your search or filters to find what you're looking for."
          hasFilter={!!q || purpose !== 'all'}
          nounPlural="forms"
        />
      }
      fetchNextPage={() => undefined}
      filters={chips}
      isError={isError}
      isLoading={isLoading}
      items={items}
      onRetry={refetch}
      onSearchChange={setSearch}
      search={search}
      typeKey="forms"
    />
  );
}
