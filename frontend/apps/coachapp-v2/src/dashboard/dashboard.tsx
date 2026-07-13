import {getInitials} from '@easy/utils';
import {Avatar, Collection, Description, Label, ListBox, Typography} from '@heroui/react';
import {ChevronRight} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useListCheckInReviewQueueQuery} from '@/api/checkins';
import {type Client, useListClientsQuery} from '@/api/clients';
import {useListCoachConversationsQuery} from '@/api/conversations';
import {useGetCoachProfileQuery} from '@/api/profile';
import {type Prospect, useListProspectsQuery} from '@/api/prospects';
import {NeedsAttentionCell} from '@/dashboard/components/needs-attention-cell';
import {QuickActionsRow} from '@/dashboard/components/quick-actions-row';
import {RecentActivityCell} from '@/dashboard/components/recent-activity-cell';
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

function StatCell({label, onClick, value}: {label: string; onClick: () => void; value: null | number | string}) {
  return (
    <button
      className="flex flex-col gap-1 p-4 text-left transition-colors hover:bg-surface-hover"
      onClick={onClick}
      type="button"
    >
      <span className="text-2xl font-bold leading-none tabular-nums">{value ?? '—'}</span>
      <span className="text-xs text-muted">{label}</span>
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const {data: profileData, isLoading: profileLoading} = useGetCoachProfileQuery();
  // ponytail: attention and subscription previews use the backend's maximum page.
  // Add server filters if coaches can exceed 100 clients.
  const {data: clientsData, isError: clientsError, isLoading: clientsLoading} = useListClientsQuery({limit: 100});
  const {
    data: pendingClientsData,
    isError: pendingClientsError,
    isLoading: pendingClientsLoading,
  } = useListClientsQuery({limit: 5, status: 'pending'});
  const {
    data: prospectsData,
    isError: prospectsError,
    isLoading: prospectsLoading,
  } = useListProspectsQuery({
    limit: 5,
    status: 'new',
  });
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

  if (profileLoading || clientsLoading || pendingClientsLoading || prospectsLoading || conversationsLoading) {
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
  const clients = clientsData?.data ?? [];
  const pendingClients = pendingClientsData?.data ?? [];
  const newProspects = prospectsData?.data ?? [];
  const clientsNeedingAttention = clients.filter(
    (client) => client.intake_incomplete || client.needs_plan || client.expiring_soon,
  );
  const subscriptionsEndingThisMonth = clients
    .filter((client) => isInCurrentCalendarMonth(client.subscription_ends_on))
    .sort((a, b) => compareDateStrings(a.subscription_ends_on, b.subscription_ends_on));
  const nothingPending = pendingClients.length === 0 && newProspects.length === 0;
  const hasPendingError = pendingClientsError || prospectsError;

  return (
    <Page>
      <Page.Header className="pb-0">
        <Page.TitleGroup>
          <Page.Title>{name ? `${greeting()}, ${name}` : greeting()}</Page.Title>
          {profile?.business.name ? <Page.Description>{profile.business.name}</Page.Description> : null}
        </Page.TitleGroup>
      </Page.Header>

      <Page.Content className="px-4 pb-8 md:px-6 lg:px-8">
        <div className="flex max-w-2xl flex-col gap-8 pt-6">
          {profile?.is_owner ? (
            <DashboardSetupCell hiddenReason={profile.business.dashboard_setup_hidden_reason} />
          ) : null}

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
              <StatCell
                label="Active clients"
                onClick={() => navigate(ROUTES.CLIENTS)}
                value={clientsError ? null : (clientSummary?.active ?? 0)}
              />
              <StatCell
                label="Pending invites"
                onClick={() => navigate(ROUTES.CLIENTS)}
                value={clientsError ? null : (clientSummary?.pending ?? 0)}
              />
              <StatCell
                label="New prospects"
                onClick={() => navigate(ROUTES.PROSPECTS)}
                value={prospectsError ? null : (prospectSummary?.new ?? 0)}
              />
              <StatCell
                label="Prospects won / lost"
                onClick={() => navigate(ROUTES.PROSPECTS)}
                value={prospectsError ? null : `${prospectSummary?.won ?? 0} / ${prospectSummary?.lost ?? 0}`}
              />
            </div>
          </div>

          <section className="flex flex-col gap-3">
            <Typography
              className="uppercase tracking-wider"
              color="muted"
              type="body-xs"
              weight="semibold"
            >
              Needs your attention
            </Typography>

            {hasPendingError ? (
              <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-8 text-center">
                <Typography
                  className="text-danger-soft-foreground"
                  type="body-sm"
                >
                  Couldn't load your latest activity. Check your connection and try again.
                </Typography>
              </div>
            ) : nothingPending ? (
              <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center">
                <Typography weight="medium">You're all caught up</Typography>
                <Typography
                  color="muted"
                  type="body-sm"
                >
                  New prospects and pending invites will show up here.
                </Typography>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {newProspects.length > 0 ? <ProspectRows prospects={newProspects} /> : null}
                {pendingClients.length > 0 ? <PendingClientRows clients={pendingClients} /> : null}
              </div>
            )}
          </section>

          <NeedsAttentionCell
            clients={clientsNeedingAttention}
            isError={clientsError}
            reviewCount={reviewQueueLoading || reviewQueueError ? null : (reviewQueueData?.data.length ?? 0)}
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

          <section className="flex flex-col gap-3">
            <Typography
              className="uppercase tracking-wider"
              color="muted"
              type="body-xs"
              weight="semibold"
            >
              Quick actions
            </Typography>
            <QuickActionsRow />
          </section>
        </div>
      </Page.Content>
    </Page>
  );
}

function ProspectRows({prospects}: {prospects: Prospect[]}) {
  const navigate = useNavigate();

  return (
    <div>
      <Typography
        className="mb-1.5 px-1"
        color="muted"
        type="body-xs"
      >
        New prospects to review
      </Typography>
      <ListBox
        aria-label="New prospects"
        className="overflow-hidden rounded-xl border border-border bg-surface"
        onAction={(key) => navigate(ROUTES.PROSPECT_DETAIL.replace(':id', String(key)))}
        selectionMode="none"
      >
        <Collection items={prospects}>
          {(prospect) => (
            <ListBox.Item
              className="min-h-fit px-4 py-3 transition-none! active:scale-100! data-[pressed=true]:scale-100!"
              id={prospect.id}
              textValue={prospect.name}
            >
              <Avatar size="sm">
                <Avatar.Fallback>{prospect.name[0]?.toUpperCase()}</Avatar.Fallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <Label className="truncate">{prospect.name}</Label>
                <Description className="truncate">{prospect.program?.name ?? 'General application'}</Description>
              </div>
              <ChevronRight
                className="ms-auto shrink-0 text-muted"
                size={16}
              />
            </ListBox.Item>
          )}
        </Collection>
      </ListBox>
    </div>
  );
}

function PendingClientRows({clients}: {clients: Client[]}) {
  const navigate = useNavigate();

  return (
    <div>
      <Typography
        className="mb-1.5 px-1"
        color="muted"
        type="body-xs"
      >
        Awaiting invite acceptance
      </Typography>
      <ListBox
        aria-label="Pending clients"
        className="overflow-hidden rounded-xl border border-border bg-surface"
        onAction={(key) => navigate(ROUTES.CLIENT_DETAIL.replace(':id', String(key)))}
        selectionMode="none"
      >
        <Collection items={clients}>
          {(client) => {
            const fullName = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Invited client';
            return (
              <ListBox.Item
                className="min-h-fit px-4 py-3 transition-none! active:scale-100! data-[pressed=true]:scale-100!"
                id={client.id}
                textValue={fullName}
              >
                <Avatar size="sm">
                  <Avatar.Fallback>{getInitials(client.first_name, client.last_name) || '?'}</Avatar.Fallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <Label className="truncate">{fullName}</Label>
                  <Description className="truncate">{client.email ?? 'Invite sent'}</Description>
                </div>
                <ChevronRight
                  className="ms-auto shrink-0 text-muted"
                  size={16}
                />
              </ListBox.Item>
            );
          }}
        </Collection>
      </ListBox>
    </div>
  );
}
