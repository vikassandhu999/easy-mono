import {getFullName, getInitials} from '@easy/utils';
import {AlertDialog, Avatar, Button, Dropdown, ToggleButton, ToggleButtonGroup, Typography, toast} from '@heroui/react';
import {
  CalendarCheck,
  Dumbbell,
  LayoutGrid,
  Mail,
  MailCheck,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Utensils,
} from 'lucide-react';
import {useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {BackButton} from '@/@components/back-button';
import {EmptyState} from '@/@components/empty-state';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import type {Client} from '@/api/clients';
import {useGetClientQuery, useResendClientInviteMutation, useRevokeClientInviteMutation} from '@/api/clients';
import {useGetCoachClientConversationQuery} from '@/api/conversations';
import {useListCoachClientTrainingPlansQuery} from '@/api/training-plans-list';
import {CheckinsTab} from '@/clients/client-screen/checkins-tab';
import {NutritionTab} from '@/clients/client-screen/nutrition-tab';
import {OverviewTab} from '@/clients/client-screen/overview-tab';
import {TrainingTab} from '@/clients/client-screen/training-tab';
import {ClientStatStrip} from '@/clients/components/client-stat-strip';
import {ClientAttentionChips, ClientStatusChip} from '@/clients/components/client-status-chips';
import {getWhatsAppUrl} from '@/clients/lib/invite-client';

/**
 * The single-client workspace: identity header, live stat bar, and pill tabs
 * switching the body (CD-OV / CD-NU / CD-TR / CD-CI).
 *
 * The interface is `<ClientScreen />` — it reads `:id` and `?tab=` itself, so the
 * router entry is one line. Everything a client screen needs to know sits behind
 * that: the fetch, the skeleton, the error, the four scenarios, the header, the
 * stat bar, the tab row, and which body to render. The four tab bodies are
 * INTERNAL parts, not interface: each takes `{client}` and nothing else, so they
 * are swappable without any caller learning about them.
 *
 * Deleting this module is the test: the header, stat bar, tab row and all four
 * loading paths would reappear in each tab file — which is exactly the shape the
 * 550-line predecessor had.
 *
 * `?tab=` rather than component state, because the attention chips and the
 * dashboard link INTO a specific tab, and a coach who lands on Training should be
 * able to share or reload that.
 *
 * The design (prototype line 907) treats pending / onboarding / expiring /
 * inactive as SCENARIOS of this screen rather than separate screens: the same
 * chrome throughout, with the state expressed by the chip row and by stat cells
 * reading "No plan". The invited state is the one exception: it has neither
 * activity stats nor tabs because the client has not joined yet.
 */
const TABS = [
  {Icon: LayoutGrid, id: 'overview', label: 'Overview'},
  {Icon: Utensils, id: 'nutrition', label: 'Nutrition'},
  {Icon: Dumbbell, id: 'training', label: 'Training'},
  {Icon: CalendarCheck, id: 'checkins', label: 'Check-ins'},
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ClientScreen() {
  const {id = ''} = useParams<{id: string}>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.CLIENTS);
  const {data, isError, isLoading, refetch} = useGetClientQuery(id);
  const canLoadActivity = data?.data.status != null && data.data.status !== 'pending';
  // The header's unread badge — the same count the inbox shows for this client.
  const conversation = useGetCoachClientConversationQuery(id, {enabled: canLoadActivity});
  const unread = conversation.data?.data?.unread_count ?? 0;

  const requested = params.get('tab');
  const tab: TabId = TABS.some((t) => t.id === requested) ? (requested as TabId) : 'overview';

  // "3 of 4": the target is how many DISTINCT weekdays the active plan schedules,
  // which is what the design's "4 days a week" counts. There is no `days_per_week`
  // field on a plan — it is derived from the plan items' `day_of_week`.
  const plans = useListCoachClientTrainingPlansQuery(id, {status: 'active'}, {enabled: canLoadActivity});
  const activePlan = plans.data?.data?.[0];
  const weeklyTarget = activePlan ? Object.values(activePlan.schedule).filter(Boolean).length || null : null;

  if (isLoading) {
    return (
      <Page>
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }
  if (isError || !data) {
    return (
      <Page>
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <ErrorState
              message="Couldn't load this client."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const client = data.data;
  const name = getFullName(client.first_name, client.last_name);
  const detailPath = (route: string) => route.replace(':id', client.id);
  // A client who has not accepted their invite has no sessions, meals, weight or
  // check-ins by definition, so activity stats and tabs are both meaningless.
  const hasAccess = canLoadActivity;

  return (
    <Page>
      <Page.Content bare>
        <Page.Frame className="flex flex-col gap-4 pt-4 pb-6">
          {/* The actions row sits ABOVE the identity, not beside it: the design
              gives Back its own row opposite Message / Call / ⋯, so the name and
              the contact line get the full width at 375px. */}
          <div className="flex items-center justify-between gap-4">
            <BackButton
              label="Back to clients"
              onPress={goBack}
            />
            <div className="flex shrink-0 items-center gap-2">
              {hasAccess && (
                <Button
                  className="relative bg-ink text-ink-foreground"
                  onPress={() => navigate(detailPath(ROUTES.CLIENT_MESSAGES))}
                >
                  <MessageCircle />
                  Message
                  {unread > 0 && (
                    <span className="-top-1 -right-1 absolute flex size-4.5 items-center justify-center rounded-pill bg-danger type-eyebrow font-bold text-danger-foreground">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Button>
              )}
              {client.phone && (
                <Button
                  aria-label={`Call ${name || 'client'}`}
                  isIconOnly
                  onPress={() => {
                    window.location.href = `tel:${client.phone}`;
                  }}
                  variant="outline"
                >
                  <Phone />
                </Button>
              )}
              {/* `Dropdown`, not `Menu` — the app's existing action menus
                  (`plan-actions-menu`) are Dropdown, and one idiom beats two. */}
              <Dropdown>
                <Button
                  aria-label="Client actions"
                  isIconOnly
                  variant="outline"
                >
                  <MoreHorizontal />
                </Button>
                <Dropdown.Popover>
                  <Dropdown.Menu>
                    <Dropdown.Item onAction={() => navigate(detailPath(ROUTES.CLIENT_DETAILS))}>
                      Details &amp; settings
                    </Dropdown.Item>
                    <Dropdown.Item onAction={() => navigate(detailPath(ROUTES.CLIENT_EDIT))}>Edit client</Dropdown.Item>
                    <Dropdown.Item onAction={() => navigate(detailPath(ROUTES.CLIENT_INTAKE))}>
                      Intake responses
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </div>
          </div>

          {/* Identity sits on the page, not in a card — the stat strip below is the
              first card on the screen. */}
          <div className="flex items-center gap-4">
            <Avatar className="size-12 shrink-0 sm:size-15">
              <Avatar.Fallback className="bg-accent type-heading font-bold text-accent-foreground">
                {getInitials(client.first_name, client.last_name)}
              </Avatar.Fallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Page.Title>{name || 'Client'}</Page.Title>
                <ClientStatusChip client={client} />
              </div>
              <ClientAttentionChips
                className="mt-2"
                client={client}
              />
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 type-eyebrow text-muted">
                {client.email && (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </span>
                )}
                {client.email && client.phone && <span className="opacity-50">·</span>}
                {client.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0" />
                    {client.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {hasAccess && (
            <div className="overflow-hidden rounded-card border border-border bg-surface">
              <ClientStatStrip
                client={client}
                weeklyTarget={weeklyTarget}
              />
            </div>
          )}

          {hasAccess ? (
            <>
              {/* `toggle-button--tab` is the theme's ghost-pill register: transparent
                  until selected, then ink-filled. The strip scrolls on mobile rather
                  than wrapping, as `.mtab`'s `flex:none` does — and the scroller has
                  to be this wrapper, not the group: `overflow-x-auto` on the group
                  itself never clipped (the group sizes to its content), so the whole
                  content column scrolled sideways at 390px instead. */}
              <div className="scrollbar-hide -mx-4 min-w-0 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <ToggleButtonGroup
                  aria-label="Client sections"
                  className="flex w-max gap-1"
                  disallowEmptySelection
                  isDetached
                  onSelectionChange={(keys) => {
                    const next = [...keys][0];
                    if (next) {
                      setParams({tab: String(next)}, {replace: true});
                    }
                  }}
                  selectedKeys={[tab]}
                  selectionMode="single"
                >
                  {TABS.map(({Icon, id: tabId, label}) => (
                    <ToggleButton
                      className="toggle-button--tab shrink-0"
                      id={tabId}
                      key={tabId}
                    >
                      <Icon />
                      {label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </div>

              {tab === 'overview' && <OverviewTab client={client} />}
              {tab === 'nutrition' && <NutritionTab client={client} />}
              {tab === 'training' && <TrainingTab client={client} />}
              {tab === 'checkins' && <CheckinsTab client={client} />}
            </>
          ) : (
            <PendingBody client={client} />
          )}
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

/**
 * CD-pending. Not a separate screen — the same identity header, with activity
 * chrome replaced by the one thing that can actually happen next.
 */
function PendingBody({client}: {client: Client}) {
  const navigate = useNavigate();
  const resend = useResendClientInviteMutation();
  const revoke = useRevokeClientInviteMutation();
  const inviteUrl = client.invite_url;

  const handleResend = async () => {
    try {
      await resend.mutateAsync(client.id);
      toast.success('Invite resent');
    } catch {
      toast.danger("Couldn't resend invite");
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Link copied');
    } catch {
      toast.danger("Couldn't copy invite link");
    }
  };

  const handleRevoke = async () => {
    try {
      await revoke.mutateAsync(client.id);
      toast.success('Invite revoked');
      navigate(ROUTES.CLIENTS, {replace: true});
    } catch {
      toast.danger("Couldn't revoke invite");
    }
  };

  return (
    <div className="rounded-card border border-border bg-surface">
      <EmptyState
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {client.email && (
              <Button
                isPending={resend.isPending}
                onPress={handleResend}
                variant="outline"
              >
                {resend.isPending ? 'Resending' : 'Resend invite'}
              </Button>
            )}
            {client.phone && inviteUrl && (
              <Button
                onPress={() =>
                  window.open(
                    getWhatsAppUrl(client.phone ?? undefined, client.first_name ?? '', inviteUrl),
                    '_blank',
                    'noopener,noreferrer',
                  )
                }
                variant="outline"
              >
                Share via WhatsApp
              </Button>
            )}
            {inviteUrl && (
              <Button
                onPress={handleCopy}
                variant="outline"
              >
                Copy link
              </Button>
            )}
            <AlertDialog>
              <Button variant="danger">Revoke invite</Button>
              <AlertDialog.Backdrop isDismissable={!revoke.isPending}>
                <AlertDialog.Container>
                  <AlertDialog.Dialog>
                    <AlertDialog.CloseTrigger />
                    <AlertDialog.Header>
                      <AlertDialog.Icon status="danger" />
                      <AlertDialog.Heading>Revoke invitation?</AlertDialog.Heading>
                    </AlertDialog.Header>
                    <AlertDialog.Body>
                      <Typography>
                        This removes {client.first_name ?? 'this client'} and invalidates their invite link.
                      </Typography>
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button
                        isDisabled={revoke.isPending}
                        slot="close"
                        variant="tertiary"
                      >
                        Cancel
                      </Button>
                      <Button
                        isPending={revoke.isPending}
                        onPress={handleRevoke}
                        variant="danger"
                      >
                        {revoke.isPending ? 'Revoking' : 'Revoke invitation'}
                      </Button>
                    </AlertDialog.Footer>
                  </AlertDialog.Dialog>
                </AlertDialog.Container>
              </AlertDialog.Backdrop>
            </AlertDialog>
          </div>
        }
        body={`${client.first_name ?? 'This client'} has not joined yet. Workouts, meals, weight and check-ins appear here once they accept.`}
        icon={MailCheck}
        title="Invite sent"
      />
    </div>
  );
}
