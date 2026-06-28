import {Spinner, Typography} from '@heroui/react';
import {ChevronRight, Dumbbell, Globe, Inbox, type LucideIcon, UserPlus, Users, UtensilsCrossed} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {type Client, useListClientsQuery} from '@/api/clients';
import {useGetCoachProfileQuery} from '@/api/profile';
import {type Prospect, useListProspectsQuery} from '@/api/prospects';
import SectionHeading from '@/settings/components/section-heading';

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

function initials(first?: null | string, last?: null | string): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';
}

function StatCard({
  icon: Icon,
  label,
  onClick,
  value,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  value: number;
}) {
  return (
    <button
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent/50"
      onClick={onClick}
      type="button"
    >
      <Icon
        className="text-muted"
        size={18}
      />
      <span className="text-2xl font-semibold leading-none">{value}</span>
      <Typography
        color="muted"
        type="body-xs"
      >
        {label}
      </Typography>
    </button>
  );
}

function AttentionRow({
  initial,
  meta,
  onClick,
  title,
}: {
  initial: string;
  meta: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-hover"
      onClick={onClick}
      type="button"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-medium text-accent">
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <Typography
          truncate
          weight="medium"
        >
          {title}
        </Typography>
        <Typography
          color="muted"
          truncate
          type="body-xs"
        >
          {meta}
        </Typography>
      </div>
      <ChevronRight
        className="shrink-0 text-muted"
        size={18}
      />
    </button>
  );
}

function QuickAction({icon: Icon, label, onClick}: {icon: LucideIcon; label: string; onClick: () => void}) {
  return (
    <button
      className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-accent/50"
      onClick={onClick}
      type="button"
    >
      <Icon
        className="shrink-0 text-accent"
        size={18}
      />
      <Typography type="body-sm">{label}</Typography>
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const {data: profileData, isLoading: profileLoading} = useGetCoachProfileQuery();
  // A filtered query still returns the full business summary, so one call per
  // resource gives both the headline counts and the "needs attention" rows.
  const {data: clientsData} = useListClientsQuery({limit: 5, status: 'pending'});
  const {data: prospectsData} = useListProspectsQuery({limit: 5, status: 'new'});

  if (profileLoading) {
    return (
      <Page>
        <Page.Content className="flex items-center justify-center px-4 py-20">
          <Spinner color="accent" />
        </Page.Content>
      </Page>
    );
  }

  const profile = profileData?.data;
  const clientSummary = clientsData?.summary;
  const prospectSummary = prospectsData?.summary;
  const pendingClients: Client[] = clientsData?.data ?? [];
  const newProspects: Prospect[] = prospectsData?.data ?? [];
  const nothingPending = pendingClients.length === 0 && newProspects.length === 0;

  const name = profile?.first_name?.trim();

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>{name ? `${greeting()}, ${name}` : greeting()}</Page.Title>
        </Page.TitleGroup>
        {profile?.business.name ? <Page.Description>{profile.business.name}</Page.Description> : null}
      </Page.Header>

      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={Users}
              label="Active clients"
              onClick={() => navigate(ROUTES.CLIENTS)}
              value={clientSummary?.active ?? 0}
            />
            <StatCard
              icon={UserPlus}
              label="Pending invites"
              onClick={() => navigate(ROUTES.CLIENTS)}
              value={clientSummary?.pending ?? 0}
            />
            <StatCard
              icon={Inbox}
              label="New prospects"
              onClick={() => navigate(ROUTES.PROSPECTS)}
              value={prospectSummary?.new ?? 0}
            />
            <StatCard
              icon={Users}
              label="Clients won"
              onClick={() => navigate(ROUTES.PROSPECTS)}
              value={prospectSummary?.won ?? 0}
            />
          </div>

          {/* Needs attention */}
          <section>
            <SectionHeading title="Needs your attention" />
            {nothingPending ? (
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
                {newProspects.length > 0 ? (
                  <div>
                    <Typography
                      className="mb-1.5"
                      color="muted"
                      type="body-xs"
                    >
                      New prospects to review
                    </Typography>
                    <div className="overflow-hidden rounded-xl border border-border bg-surface">
                      {newProspects.map((prospect) => (
                        <AttentionRow
                          initial={initials(prospect.name)}
                          key={prospect.id}
                          meta={prospect.program?.name ?? 'General application'}
                          onClick={() => navigate(ROUTES.PROSPECT_DETAIL.replace(':id', prospect.id))}
                          title={prospect.name}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {pendingClients.length > 0 ? (
                  <div>
                    <Typography
                      className="mb-1.5"
                      color="muted"
                      type="body-xs"
                    >
                      Awaiting invite acceptance
                    </Typography>
                    <div className="overflow-hidden rounded-xl border border-border bg-surface">
                      {pendingClients.map((client) => (
                        <AttentionRow
                          initial={initials(client.first_name, client.last_name)}
                          key={client.id}
                          meta={client.email ?? 'Invite sent'}
                          onClick={() => navigate(ROUTES.CLIENT_DETAIL.replace(':id', client.id))}
                          title={[client.first_name, client.last_name].filter(Boolean).join(' ') || 'Invited client'}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          {/* Quick actions */}
          <section>
            <SectionHeading title="Quick actions" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <QuickAction
                icon={UserPlus}
                label="Invite a client"
                onClick={() => navigate(ROUTES.INVITE_CLIENT)}
              />
              <QuickAction
                icon={Dumbbell}
                label="New training plan"
                onClick={() => navigate(ROUTES.CREATE_TRAINING_PLAN)}
              />
              <QuickAction
                icon={UtensilsCrossed}
                label="New nutrition plan"
                onClick={() => navigate(ROUTES.CREATE_NUTRITION_PLAN)}
              />
              <QuickAction
                icon={Globe}
                label="Edit landing page"
                onClick={() => navigate(ROUTES.SETTINGS_LANDING_PAGE)}
              />
            </div>
          </section>
        </div>
      </Page.Content>
    </Page>
  );
}
