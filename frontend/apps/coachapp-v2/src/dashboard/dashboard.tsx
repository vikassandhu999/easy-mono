import {Avatar, Collection, Description, Label, ListBox, Spinner, Typography} from '@heroui/react';
import {ChevronRight, Dumbbell, Globe, type LucideIcon, UserPlus, UtensilsCrossed} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {type Client, useListClientsQuery} from '@/api/clients';
import {useGetCoachProfileQuery} from '@/api/profile';
import {type Prospect, useListProspectsQuery} from '@/api/prospects';

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

function StatCell({label, onClick, value}: {label: string; onClick: () => void; value: number}) {
  return (
    <button
      className="flex flex-col gap-1 p-4 text-left transition-colors hover:bg-surface-hover"
      onClick={onClick}
      type="button"
    >
      <span className="text-2xl font-bold leading-none tabular-nums">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </button>
  );
}

function QuickAction({icon: Icon, label, onClick}: {icon: LucideIcon; label: string; onClick: () => void}) {
  return (
    <button
      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-left text-sm font-medium transition-colors hover:bg-surface-hover"
      onClick={onClick}
      type="button"
    >
      <Icon
        className="shrink-0 text-muted"
        size={16}
      />
      {label}
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const {data: profileData, isLoading: profileLoading} = useGetCoachProfileQuery();
  const {data: clientsData, isError: clientsError} = useListClientsQuery({limit: 5, status: 'pending'});
  const {data: prospectsData, isError: prospectsError} = useListProspectsQuery({limit: 5, status: 'new'});

  if (profileLoading) {
    return (
      <Page>
        <Page.Content className="flex items-center justify-center py-20">
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
  const hasError = clientsError || prospectsError;

  const name = profile?.first_name?.trim();

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
          {/* Stats */}
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
              <StatCell
                label="Active clients"
                onClick={() => navigate(ROUTES.CLIENTS)}
                value={clientSummary?.active ?? 0}
              />
              <StatCell
                label="Pending invites"
                onClick={() => navigate(ROUTES.CLIENTS)}
                value={clientSummary?.pending ?? 0}
              />
              <StatCell
                label="New prospects"
                onClick={() => navigate(ROUTES.PROSPECTS)}
                value={prospectSummary?.new ?? 0}
              />
              <StatCell
                label="Clients won"
                onClick={() => navigate(ROUTES.PROSPECTS)}
                value={prospectSummary?.won ?? 0}
              />
            </div>
          </div>

          {/* Needs attention */}
          <section className="flex flex-col gap-3">
            <Typography
              color="muted"
              type="body-xs"
              weight="semibold"
              className="uppercase tracking-wider"
            >
              Needs your attention
            </Typography>

            {hasError ? (
              <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-8 text-center">
                <Typography
                  className="text-danger"
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
                {newProspects.length > 0 ? (
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
                      <Collection items={newProspects}>
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
                              <Description className="truncate">
                                {prospect.program?.name ?? 'General application'}
                              </Description>
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
                ) : null}

                {pendingClients.length > 0 ? (
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
                      <Collection items={pendingClients}>
                        {(client) => {
                          const fullName =
                            [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Invited client';
                          return (
                            <ListBox.Item
                              className="min-h-fit px-4 py-3 transition-none! active:scale-100! data-[pressed=true]:scale-100!"
                              id={client.id}
                              textValue={fullName}
                            >
                              <Avatar size="sm">
                                <Avatar.Fallback>{initials(client.first_name, client.last_name)}</Avatar.Fallback>
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
                ) : null}
              </div>
            )}
          </section>

          {/* Quick actions */}
          <section className="flex flex-col gap-3">
            <Typography
              color="muted"
              type="body-xs"
              weight="semibold"
              className="uppercase tracking-wider"
            >
              Quick actions
            </Typography>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
