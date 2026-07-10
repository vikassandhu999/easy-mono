import {CirclePause, Clock, Inbox, Users} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useListClientsQuery} from '@/api/clients';
import {useListCoachConversationsQuery} from '@/api/conversations';
import {useGetCoachProfileQuery} from '@/api/profile';
import {useListProspectsQuery} from '@/api/prospects';
import {NeedsAttentionCell} from '@/dashboard/components/needs-attention-cell';
import {QuickActionsRow} from '@/dashboard/components/quick-actions-row';
import {RecentActivityCell} from '@/dashboard/components/recent-activity-cell';
import {StatCell} from '@/dashboard/components/stat-cell';
import {SubscriptionsEndingCell} from '@/dashboard/components/subscriptions-ending-cell';
import {DashboardSetupCell} from '@/dashboard/dashboard-setup-cell';
import {compareDateStrings, isInCurrentCalendarMonth} from '@/dashboard/lib/date-format';

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
  const clients = clientsData?.data ?? [];
  const clientsNeedingAttention = clients.filter(
    (client) => client.intake_incomplete || client.needs_plan || client.expiring_soon,
  );
  const subscriptionsEndingThisMonth = clients
    .filter((client) => isInCurrentCalendarMonth(client.subscription_ends_on))
    .sort((a, b) => compareDateStrings(a.subscription_ends_on, b.subscription_ends_on));

  return (
    <Page className="bg-surface">
      <Page.Header className="pb-0">
        <Page.TitleGroup>
          <Page.Title>{name ? `${greeting()}, ${name}` : greeting()}</Page.Title>
          {profile?.business.name ? <Page.Description>{profile.business.name}</Page.Description> : null}
        </Page.TitleGroup>
      </Page.Header>

      <Page.Content className="px-4 pb-8 md:px-6 lg:px-8">
        <div className="flex max-w-5xl flex-col gap-6 pt-6">
          {/* 4 columns + 14px gap mirrors the mockup's bento. Cell spans below use the same sm: breakpoint. */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-4">
            {profile?.is_owner ? (
              <DashboardSetupCell hiddenReason={profile.business.dashboard_setup_hidden_reason} />
            ) : null}
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
              errorLabel={clientsError ? "Couldn't load clients" : undefined}
              icon={CirclePause}
              label="Inactive clients"
              meta="Paused"
              onPress={() => navigate(ROUTES.CLIENTS)}
              value={clientsError ? null : (clientSummary?.inactive ?? 0)}
            />
            <StatCell
              errorLabel={prospectsError ? "Couldn't load prospects" : undefined}
              icon={Inbox}
              label="Prospects"
              meta="Applications"
              onPress={() => navigate(ROUTES.PROSPECTS)}
              value={prospectsError ? null : (prospectsData?.count ?? 0)}
            />

            <NeedsAttentionCell
              clients={clientsNeedingAttention}
              isError={clientsError}
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
