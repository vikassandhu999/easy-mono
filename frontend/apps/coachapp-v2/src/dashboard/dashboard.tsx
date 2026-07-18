import {Skeleton} from '@heroui/react';
import {cn} from '@heroui/styles';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useListCheckInReviewQueueQuery} from '@/api/checkins';
import {useListClientsQuery} from '@/api/clients';
import {useListCoachConversationsQuery} from '@/api/conversations';
import {useGetCoachProfileQuery} from '@/api/profile';
import {useListProspectsQuery} from '@/api/prospects';
import {PriorityQueue} from '@/dashboard/components/priority-queue';
import {QuickActionsRow} from '@/dashboard/components/quick-actions-row';
import {RecentActivityCell} from '@/dashboard/components/recent-activity-cell';
import {DashboardSetupCell} from '@/dashboard/dashboard-setup-cell';
import {formatDashboardDate} from '@/dashboard/lib/date-format';

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

const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.09em] text-muted';

function StatGroup({
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
    <div
      className={cn(
        'flex items-stretch divide-x divide-border overflow-hidden rounded-2xl border border-border bg-surface',
        className,
      )}
    >
      {cells.map((cell) => (
        <button
          className="flex flex-1 flex-col gap-0.5 px-5 py-2.5 text-left transition-colors hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          key={cell.label}
          onClick={() => navigate(ROUTES.CLIENTS)}
          type="button"
        >
          <span className="font-grotesk text-[22px] font-semibold leading-tight tabular-nums text-foreground">
            {cell.value ?? '—'}
          </span>
          <span className="whitespace-nowrap text-[11.5px] text-muted">{cell.label}</span>
        </button>
      ))}
    </div>
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
        <Skeleton className="hidden h-16 w-56 rounded-2xl sm:block" />
      </Page.Header>
      <Page.Content>
        <Page.Frame
          className="flex flex-col gap-5 pb-8 pt-4"
          size="wide"
        >
          <Skeleton className="h-16 w-full rounded-2xl" />
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
            <Skeleton className="h-80 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
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
        <StatGroup
          active={clientSummary?.active ?? 0}
          className="hidden sm:flex"
          isError={clientsError}
          pending={clientSummary?.pending ?? 0}
        />
      </Page.Header>

      <Page.Content>
        <Page.Frame
          className="flex flex-col gap-5 pb-8 pt-4"
          size="wide"
        >
          <StatGroup
            active={clientSummary?.active ?? 0}
            className="sm:hidden"
            isError={clientsError}
            pending={clientSummary?.pending ?? 0}
          />

          {profile?.is_owner ? (
            <DashboardSetupCell hiddenReason={profile.business.dashboard_setup_hidden_reason} />
          ) : null}

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
            <PriorityQueue
              clients={clients}
              isError={clientsError}
              prospects={newProspects}
              reviewCount={reviewQueueLoading || reviewQueueError ? null : (reviewQueueData?.data.length ?? 0)}
              reviewError={reviewQueueError}
            />

            <div className="flex min-w-0 flex-col gap-5">
              <RecentActivityCell
                conversations={conversationsData?.data ?? []}
                isError={conversationsError}
              />
              <section className="flex flex-col gap-3">
                <h2 className="font-grotesk text-base font-semibold text-foreground">Quick actions</h2>
                <QuickActionsRow />
              </section>
            </div>
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
