import {Button, Separator, Skeleton, Surface, Typography} from '@heroui/react';
import {cn} from '@heroui/styles';
import {Fragment} from 'react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useListCheckInReviewQueueQuery} from '@/api/checkins';
import {useListClientsQuery} from '@/api/clients';
import {useListCoachConversationsQuery} from '@/api/conversations';
import {useGetCoachProfileQuery} from '@/api/profile';
import {useListProspectsQuery} from '@/api/prospects';
import {DashboardSectionHeading} from '@/dashboard/components/dashboard-section-heading';
import {PriorityQueue} from '@/dashboard/components/priority-queue';
import {QuickActionsRow} from '@/dashboard/components/quick-actions-row';
import {RecentActivityCell} from '@/dashboard/components/recent-activity-cell';
import {DashboardSetupCell} from '@/dashboard/dashboard-setup-cell';
import {daysSince, formatDashboardDate} from '@/dashboard/lib/date-format';

/**
 * COPY.md §DB check-ins card subtitle — `Oldest waiting 2 days · Sam, Priya, Devon +2`.
 * Both halves come from the review-queue rows; nothing is invented.
 */
function reviewSummary(queue: {client: {first_name: null | string}; inserted_at: string}[]) {
  const names = queue
    .map((entry) => entry.client.first_name?.trim())
    .filter((name): name is string => Boolean(name))
    .filter((name, index, all) => all.indexOf(name) === index);
  const shown = names.slice(0, 3).join(', ');
  const overflow = names.length - 3;

  return {
    names: shown ? (overflow > 0 ? `${shown} +${overflow}` : shown) : '',
    oldestDays: queue.reduce<null | number>((oldest, entry) => {
      const days = daysSince(entry.inserted_at);
      return days === null ? oldest : Math.max(oldest ?? 0, days);
    }, null),
  };
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 18) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

// RECIPES.md R9 — the date eyebrow above the greeting.
const EYEBROW = 'text-xs font-semibold uppercase tracking-wider text-muted';

/**
 * GAPS #1 — the glance bar is a `Surface` holding two stat blocks (`Typography`
 * number + label) with a vertical `Separator` between. No custom stat component
 * and no Card per number.
 *
 * The blocks stay pressable (they deep-link to CL) — that behaviour predates the
 * redesign and the ref doesn't contradict it, so it's kept rather than dropped.
 */
function StatBar({
  active,
  className,
  isError,
  pending,
}: {
  active: number;
  className?: string;
  isError: boolean;
  pending: number;
}) {
  const navigate = useNavigate();
  const cells = [
    {label: 'Active clients', value: isError ? null : active},
    {label: 'Pending invites', value: isError ? null : pending},
  ];

  return (
    <Surface className={cn('flex items-stretch overflow-hidden rounded-card border border-border', className)}>
      {cells.map((cell, index) => (
        <Fragment key={cell.label}>
          {index > 0 ? (
            <Separator
              className="self-stretch"
              orientation="vertical"
            />
          ) : null}
          <Button
            className="h-auto min-h-11 flex-1 flex-col items-start justify-center gap-0.5 rounded-none px-5 py-2.5"
            onPress={() => navigate(ROUTES.CLIENTS)}
            variant="ghost"
          >
            <Typography
              className="font-grotesk tabular-nums"
              type="h4"
            >
              {cell.value ?? '—'}
            </Typography>
            <Typography
              className="whitespace-nowrap font-normal"
              color="muted"
              type="body-sm"
            >
              {cell.label}
            </Typography>
          </Button>
        </Fragment>
      ))}
    </Surface>
  );
}

function DashboardSkeleton() {
  return (
    <Page>
      <Page.Header
        className="items-end"
        size="wide"
      >
        <Page.TitleGroup>
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="mt-2 h-8 w-56 max-w-full rounded-lg" />
        </Page.TitleGroup>
        <Skeleton className="hidden h-16 w-56 rounded-card sm:block" />
      </Page.Header>
      <Page.Content bare>
        <Page.Frame
          className="flex flex-col gap-5 pb-8 pt-4"
          size="wide"
        >
          <Skeleton className="h-16 w-full rounded-card" />
          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
            <Skeleton className="h-80 w-full rounded-card" />
            <Skeleton className="h-72 w-full rounded-card" />
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

export default function Dashboard() {
  const {data: profileData, isLoading: profileLoading} = useGetCoachProfileQuery();
  // ponytail: attention preview uses the backend's maximum page.
  // Add server filters if coaches can exceed 100 clients.
  const {data: clientsData, isError: clientsError, isLoading: clientsLoading} = useListClientsQuery({limit: 100});
  const {
    data: prospectsData,
    isError: prospectsError,
    isLoading: prospectsLoading,
  } = useListProspectsQuery({limit: 5, status: 'new'});
  const {data: conversationsData, isError: conversationsError} = useListCoachConversationsQuery({limit: 5});
  const {
    data: reviewQueueData,
    isError: reviewQueueError,
    isLoading: reviewQueueLoading,
  } = useListCheckInReviewQueueQuery();

  if (profileLoading || clientsLoading || prospectsLoading) {
    return <DashboardSkeleton />;
  }

  const profile = profileData?.data;
  const name = profile?.first_name?.trim();
  const clientSummary = clientsData?.summary;
  const clients = clientsData?.data ?? [];
  const newProspects = prospectsError ? [] : (prospectsData?.data ?? []);
  const review = reviewSummary(reviewQueueData?.data ?? []);

  return (
    <Page>
      <Page.Header
        className="items-end"
        size="wide"
      >
        <Page.TitleGroup>
          <div className={EYEBROW}>{formatDashboardDate()}</div>
          <Page.Title className="mt-1.5 font-grotesk">{name ? `${greeting()}, ${name}` : greeting()}</Page.Title>
        </Page.TitleGroup>
        <StatBar
          active={clientSummary?.active ?? 0}
          className="hidden sm:flex"
          isError={clientsError}
          pending={clientSummary?.pending ?? 0}
        />
      </Page.Header>

      <Page.Content bare>
        <Page.Frame
          className="flex flex-col gap-5 pb-8 pt-4"
          size="wide"
        >
          <StatBar
            active={clientSummary?.active ?? 0}
            className="sm:hidden"
            isError={clientsError}
            pending={clientSummary?.pending ?? 0}
          />

          {profile?.is_owner ? (
            <DashboardSetupCell hiddenReason={profile.business.dashboard_setup_hidden_reason} />
          ) : null}

          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
            <PriorityQueue
              clients={clients}
              isError={clientsError}
              prospects={newProspects}
              reviewCount={reviewQueueLoading || reviewQueueError ? null : (reviewQueueData?.data.length ?? 0)}
              reviewError={reviewQueueError}
              reviewNames={review.names}
              reviewOldestDays={review.oldestDays}
            />

            <div className="flex min-w-0 flex-col gap-5">
              <RecentActivityCell
                conversations={conversationsData?.data ?? []}
                isError={conversationsError}
              />
              <section className="flex min-w-0 flex-col gap-3">
                <DashboardSectionHeading title="Quick actions" />
                <QuickActionsRow />
              </section>
            </div>
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
