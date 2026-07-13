import {Button} from '@heroui/react';
import {Clock, Inbox, UserPlus, Users} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useListCheckInReviewQueueQuery} from '@/api/checkins';
import {useListClientsQuery} from '@/api/clients';
import {useListCoachConversationsQuery} from '@/api/conversations';
import {useGetCoachProfileQuery} from '@/api/profile';
import {useListProspectsQuery} from '@/api/prospects';
import {NeedsAttentionCell} from '@/dashboard/components/needs-attention-cell';
import {QuickActionsRow} from '@/dashboard/components/quick-actions-row';
import {RecentActivityCell} from '@/dashboard/components/recent-activity-cell';
import {StatCell} from '@/dashboard/components/stat-cell';
import {SubscriptionsEndingCell} from '@/dashboard/components/subscriptions-ending-cell';
import {WonLostStatCell} from '@/dashboard/components/won-lost-stat-cell';
import {DashboardSetupCell} from '@/dashboard/dashboard-setup-cell';
import {compareDateStrings, formatDashboardDate, isInCurrentCalendarMonth} from '@/dashboard/lib/date-format';
import {MobileDashboard} from '@/dashboard/mobile-dashboard';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const {data: profileData, isLoading: profileLoading} = useGetCoachProfileQuery();
  // ponytail: needs-attention and subscriptions-ending are computed client-side over the
  // first 100 clients — the list endpoint has no attention/expiry filter. A coach with more
  // than 100 clients will miss rows. Add a server-side filter before that's reachable.
  const {data: clientsData, isError: clientsError, isLoading: clientsLoading} = useListClientsQuery({limit: 100});
  const {data: prospectsData, isError: prospectsError, isLoading: prospectsLoading} = useListProspectsQuery({limit: 1});
  const {
    data: conversationsData,
    isError: conversationsError,
    isLoading: conversationsLoading,
  } = useListCoachConversationsQuery({limit: 5});
  const {
    data: reviewQueueData,
    isError: reviewQueueError,
    isLoading: reviewQueueLoading,
  } = useListCheckInReviewQueueQuery();

  const isFirstLoad = profileLoading || clientsLoading || prospectsLoading || conversationsLoading;

  if (isFirstLoad) {
    return (
      <Page>
        <Page.Content className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  const profile = profileData?.data;
  const name = profile?.first_name?.trim();
  const clientSummary = clientsData?.summary;
  const prospectSummary = prospectsData?.summary;
  const newProspectCount = prospectSummary?.new ?? 0;
  const pendingInviteCount = clientSummary?.pending ?? 0;
  const attentionSummary =
    clientsError || prospectsError
      ? null
      : `${newProspectCount} new ${newProspectCount === 1 ? 'prospect' : 'prospects'} and ${pendingInviteCount} pending ${pendingInviteCount === 1 ? 'invite' : 'invites'} need you today.`;
  const dashboardSummary = [profile?.business.name?.trim(), attentionSummary].filter(Boolean).join(' · ');
  const clients = clientsData?.data ?? [];
  const clientsNeedingAttention = clients.filter(
    (client) => client.intake_incomplete || client.needs_plan || client.expiring_soon,
  );
  const subscriptionsEndingThisMonth = clients
    .filter((client) => isInCurrentCalendarMonth(client.subscription_ends_on))
    .sort((a, b) => compareDateStrings(a.subscription_ends_on, b.subscription_ends_on));

  return (
    <Page className="bg-surface">
      <Page.Header className="flex-col items-stretch gap-4 px-4 pt-2 pb-0 sm:px-6 sm:pt-6 md:flex-row md:items-end lg:px-8 lg:pt-8">
        <div className="min-w-0 flex-1">
          <p className="text-2xs font-semibold uppercase tracking-widest text-link sm:text-xs">
            {formatDashboardDate()}
          </p>
          <h1 className="mt-1.5 font-grotesk text-2xl font-bold leading-tight tracking-tight sm:hidden">
            {name ? (
              <>
                {greeting()},
                <br />
                {name}.
              </>
            ) : (
              `${greeting()}.`
            )}
          </h1>
          <h1 className="mt-2 hidden font-grotesk text-4xl font-bold leading-none tracking-tight sm:block">
            {name ? `${greeting()}, ${name}.` : `${greeting()}.`}
          </h1>
          {dashboardSummary ? <p className="mt-3 hidden text-sm text-muted sm:block">{dashboardSummary}</p> : null}
        </div>
        <Button
          className="hidden min-h-11 md:flex md:w-auto"
          onPress={() => navigate(ROUTES.INVITE_CLIENT)}
          variant="primary"
        >
          <UserPlus size={17} />
          Invite a client
        </Button>
      </Page.Header>

      <Page.Content className="px-4 pb-8 sm:px-6 lg:px-8">
        <div className="flex max-w-5xl flex-col gap-4 pt-4 sm:gap-6 sm:pt-6">
          {profile?.is_owner ? (
            <DashboardSetupCell hiddenReason={profile.business.dashboard_setup_hidden_reason} />
          ) : null}

          <MobileDashboard
            activeClients={clientsError ? null : (clientSummary?.active ?? 0)}
            attentionClients={clientsNeedingAttention}
            clientsError={clientsError}
            conversations={conversationsData?.data ?? []}
            conversationsError={conversationsError}
            lostProspects={prospectSummary?.lost}
            newProspects={prospectsError ? null : newProspectCount}
            prospectsError={prospectsError}
            subscriptionsEnding={subscriptionsEndingThisMonth}
            reviewCount={reviewQueueLoading || reviewQueueError ? null : (reviewQueueData?.data.length ?? 0)}
            reviewError={reviewQueueError}
            wonProspects={prospectSummary?.won}
          />

          {/* Desktop bento remains independent from the dedicated Mobile Frame B renderer. */}
          <div className="hidden grid-cols-4 gap-3.5 sm:grid">
            <StatCell
              errorLabel={clientsError ? "Couldn't load clients" : undefined}
              icon={Users}
              label="Active clients"
              meta="Active now"
              onPress={() => navigate(ROUTES.CLIENTS)}
              value={clientsError ? null : (clientSummary?.active ?? 0)}
            />
            <StatCell
              errorLabel={clientsError ? "Couldn't load clients" : undefined}
              icon={Clock}
              label="Pending clients"
              meta="Awaiting invite"
              onPress={() => navigate(ROUTES.CLIENTS)}
              value={clientsError ? null : (clientSummary?.pending ?? 0)}
            />
            <StatCell
              errorLabel={prospectsError ? "Couldn't load prospects" : undefined}
              icon={Inbox}
              label="New prospects"
              meta="Review now"
              onPress={() => navigate(ROUTES.PROSPECTS)}
              value={prospectsError ? null : newProspectCount}
            />
            <WonLostStatCell
              isError={prospectsError}
              lost={prospectSummary?.lost}
              onPress={() => navigate(ROUTES.PROSPECTS)}
              won={prospectSummary?.won}
            />

            <NeedsAttentionCell
              clients={clientsNeedingAttention}
              isError={clientsError}
              reviewCount={reviewQueueLoading || reviewQueueError ? 0 : (reviewQueueData?.data.length ?? 0)}
              reviewError={reviewQueueError}
            />
            <RecentActivityCell
              conversations={conversationsData?.data ?? []}
              isError={conversationsError}
            />
            <SubscriptionsEndingCell
              clients={subscriptionsEndingThisMonth}
              isError={clientsError}
            />
            <QuickActionsRow />
          </div>
        </div>
      </Page.Content>
    </Page>
  );
}
