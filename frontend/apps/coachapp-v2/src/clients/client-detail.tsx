/**
 * CD — client detail shell (spec §2, design `Client Detail.dc.html`).
 * Header + stat strip + tabs, driven by client.status + attention flags (§8).
 * CD/OV is the ported tab; Training/Nutrition/Check-ins temporarily reuse the
 * pre-redesign components until their own ports (CD/TR, CD/NU, CD/CI) land.
 * Style fidelity: design-handoff/manifests/CD-OV.json (style-diff.mjs) — the
 * data-testid attributes are the manifest's selectors.
 */
import {getInitials} from '@easy/utils';
import {AlertDialog, Avatar, Button, Chip, Dropdown, Label, Tabs, Typography, toast} from '@heroui/react';
import {
  AlarmClock,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  Dumbbell,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  UserX,
} from 'lucide-react';
import {useState} from 'react';
import {useNavigate, useParams, useSearchParams} from 'react-router-dom';

import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useListCheckInSchedulesForClientQuery} from '@/api/checkins';
import {useGetClientQuery, useUpdateClientMutation} from '@/api/clients';
import {useGetCoachClientConversationQuery} from '@/api/conversations';
import type {Client} from '@/api/generated';
import {useListCoachClientNutritionPlansQuery} from '@/api/nutrition-plans-list';
import {useListCoachClientTrainingPlansQuery} from '@/api/training-plans-list';
import CheckinsTab from '@/clients/client-detail/checkins-tab';
import {formatShortDate} from '@/clients/client-detail/data';
import NutritionTab from '@/clients/client-detail/nutrition-tab';
import OverviewTab, {DetailsRow, NotesCard} from '@/clients/client-detail/overview-tab';
import PendingBody from '@/clients/client-detail/pending-body';
import StatStrip from '@/clients/client-detail/stat-strip';
import TrainingTab from '@/clients/client-detail/training-tab';
import {ACCENT_BUTTON, CHIP} from '@/clients/client-detail/ui';

const TAB_IDS = ['overview', 'training', 'nutrition', 'check-ins'] as const;
type TabId = (typeof TAB_IDS)[number];

const TAB_CLASS =
  'w-auto min-w-0 flex-1 justify-center rounded-none border-0 border-b-2 border-b-transparent bg-transparent px-0.5 pt-3 pb-3 text-body font-medium text-muted [box-shadow:none] outline-none ' +
  'data-[selected=true]:border-b-current data-[selected=true]:font-semibold data-[selected=true]:text-foreground ' +
  'sm:flex-none sm:justify-start sm:px-1 sm:pt-3 sm:pb-3 sm:text-body';

function AttentionChips({client}: {client: Client}) {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const chips: React.ReactNode[] = [];
  if (client.needs_plan && client.status === 'active') {
    chips.push(
      <Button
        className={`${CHIP} h-auto min-h-0 bg-warning-soft [color:var(--color-warning-soft-foreground)]`}
        data-testid="cd-attn-plan"
        key="plan"
        onPress={() => setSearchParams({tab: 'training'}, {replace: true})}
        variant="ghost"
      >
        <Dumbbell className="size-3.25" />
        No active plan
      </Button>,
    );
  }
  if (client.expiring_soon && client.subscription_ends_on) {
    chips.push(
      <Button
        className={`${CHIP} h-auto min-h-0 bg-danger-soft [color:var(--color-danger-soft-foreground)]`}
        data-testid="cd-attn-expires"
        key="expires"
        onPress={() => navigate(ROUTES.CLIENT_DETAILS.replace(':id', client.id))}
        variant="ghost"
      >
        <AlarmClock className="size-3.25" />
        Expires {formatShortDate(client.subscription_ends_on)}
      </Button>,
    );
  }
  if (client.intake_incomplete) {
    chips.push(
      <Chip
        className={`${CHIP} bg-warning-soft [color:var(--color-warning-soft-foreground)]`}
        data-testid="cd-attn-intake"
        key="intake"
      >
        <ClipboardList className="size-3.25" />
        Intake pending
      </Chip>,
    );
  }
  if (chips.length === 0) {
    return null;
  }
  return <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:mt-2">{chips}</div>;
}

function StatusChip({status}: {status: Client['status']}) {
  if (status === 'active') {
    return (
      <Chip
        className={`${CHIP} bg-success-soft [color:var(--color-success-soft-foreground)]`}
        data-testid="cd-status-chip"
      >
        <span className="size-1.5 rounded-pill bg-success sm:size-1.75" />
        Active
      </Chip>
    );
  }
  if (status === 'pending') {
    return (
      <Chip
        className={`${CHIP} bg-warning-soft [color:var(--color-warning-soft-foreground)]`}
        data-testid="cd-status-chip"
      >
        Invited
      </Chip>
    );
  }
  return (
    <Chip
      className={`${CHIP} bg-default-soft [color:var(--color-default-soft-foreground)]`}
      data-testid="cd-status-chip"
    >
      Inactive
    </Chip>
  );
}

function StateBanner({client}: {client: Client}) {
  const navigate = useNavigate();
  const [updateClient, {isLoading}] = useUpdateClientMutation();
  if (client.status !== 'inactive') {
    return null;
  }
  const reason = client.inactive_reason ?? 'manual';
  const firstName = client.first_name ?? 'This client';

  const reactivate = async () => {
    try {
      await updateClient({body: {status: 'active'}, id: client.id}).unwrap();
      toast.success(`${firstName} is active again.`);
    } catch {
      toast.danger("Client wasn't reactivated");
    }
  };

  if (reason === 'subscription_expired') {
    return (
      <div
        className="flex items-center gap-3 rounded-panel border border-danger/30 bg-danger-soft px-3 py-3 sm:mb-4 sm:gap-3 sm:px-4 sm:py-3"
        data-testid="cd-banner"
      >
        <span className="flex size-8 flex-none items-center justify-center rounded-control bg-danger/20 text-danger-soft-foreground sm:size-8.5">
          <AlertTriangle className="size-4 sm:size-4.25" />
        </span>
        <div
          className="min-w-0 flex-1 text-eyebrow font-semibold text-danger-soft-foreground sm:text-body"
          data-testid="cd-banner-text"
        >
          Subscription has ended. {firstName} is locked out of the app.
        </div>
        <Button
          className={`${ACCENT_BUTTON} h-8 px-3 sm:h-8.5 sm:px-4`}
          data-testid="cd-banner-btn"
          onPress={() => navigate(ROUTES.CLIENT_DETAILS.replace(':id', client.id))}
        >
          Extend subscription
        </Button>
      </div>
    );
  }

  if (reason === 'awaiting_seat') {
    return (
      <div
        className="flex items-center gap-3 rounded-panel border border-warning/32 bg-warning-soft px-3 py-3 sm:mb-4 sm:gap-3 sm:px-4 sm:py-3"
        data-testid="cd-banner"
      >
        <span className="flex size-8 flex-none items-center justify-center rounded-control bg-warning/26 text-warning-soft-foreground sm:size-8.5">
          <AlertCircle className="size-4 sm:size-4.25" />
        </span>
        <div
          className="min-w-0 flex-1 text-eyebrow font-semibold text-warning-soft-foreground sm:text-body"
          data-testid="cd-banner-text"
        >
          No seat available. {firstName} can&apos;t use the app until you add one.
        </div>
        <Button
          className={`${ACCENT_BUTTON} h-8 px-3 sm:h-8.5 sm:px-4`}
          data-testid="cd-banner-btn"
          onPress={() => navigate(ROUTES.SETTINGS)}
        >
          Add seats
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 rounded-panel border border-border bg-surface-tertiary px-3 py-3 sm:mb-4 sm:gap-3 sm:px-4 sm:py-3"
      data-testid="cd-banner"
    >
      <span className="flex size-8 flex-none items-center justify-center rounded-control bg-surface text-muted sm:size-8.5">
        <UserX className="size-4 sm:size-4.25" />
      </span>
      <div
        className="min-w-0 flex-1 text-eyebrow font-semibold sm:text-body"
        data-testid="cd-banner-text"
      >
        {firstName} is inactive.
      </div>
      <Button
        className={`${ACCENT_BUTTON} h-8 px-3 sm:h-8.5 sm:px-4`}
        data-testid="cd-banner-btn"
        isPending={isLoading}
        onPress={reactivate}
      >
        Reactivate
      </Button>
    </div>
  );
}

export default function ClientDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.CLIENTS);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDeactivateOpen, setDeactivateOpen] = useState(false);
  const {data, isError, isLoading, refetch} = useGetClientQuery(id!);
  const [updateClient, {isLoading: isDeactivating}] = useUpdateClientMutation();

  const client = data?.data;
  const isPending = client?.status === 'pending';

  const conversation = useGetCoachClientConversationQuery({clientId: id!}, {skip: !client || isPending});
  const {data: trainingPlans} = useListCoachClientTrainingPlansQuery({clientId: id!}, {skip: !client || isPending});
  const {data: nutritionPlans} = useListCoachClientNutritionPlansQuery({clientId: id!}, {skip: !client || isPending});
  const {data: schedules} = useListCheckInSchedulesForClientQuery({clientId: id!}, {skip: !client || isPending});

  if (isLoading) {
    return (
      <Page className="bg-background [line-height:normal]">
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  if (isError || !client) {
    return (
      <Page className="bg-background">
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <ErrorState
              message="This client couldn't load. They may not exist, or you may not have access."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const name = [client.first_name, client.last_name].filter(Boolean).join(' ');
  const initials = getInitials(client.first_name, client.last_name);
  const unread = conversation.data?.data.unread_count ?? 0;
  const isFresh =
    client.status === 'active' &&
    !(trainingPlans?.data ?? []).some((plan) => plan.status === 'active') &&
    !(nutritionPlans?.data ?? []).some((plan) => plan.status === 'active') &&
    (schedules?.data ?? []).length === 0;

  const tab = (TAB_IDS as readonly string[]).includes(searchParams.get('tab') ?? '')
    ? (searchParams.get('tab') as TabId)
    : 'overview';

  const deactivate = async () => {
    try {
      await updateClient({body: {status: 'inactive'}, id: client.id}).unwrap();
      setDeactivateOpen(false);
      toast.success('Client deactivated');
    } catch {
      toast.danger("Client wasn't deactivated");
    }
  };

  return (
    <Page className="bg-background">
      <Page.Content
        bare
        className="p-0"
      >
        {/* ── header zone ─────────────────────────────────────────────── */}
        <div className="border-b border-border bg-surface px-4 pt-1.5 text-foreground [line-height:normal] sm:px-8 sm:pt-4">
          <div className="flex items-center justify-between">
            <Button
              className="h-auto min-h-0 min-w-0 gap-1 rounded-none bg-transparent p-0 text-eyebrow font-semibold text-muted [box-shadow:none] sm:gap-2"
              data-testid="cd-back"
              onPress={goBack}
              variant="ghost"
            >
              <ArrowLeft className="size-4" />
              Clients
            </Button>
            <Dropdown>
              <Button
                aria-label="More"
                className="size-8 min-h-0 min-w-0 rounded-panel border-0 bg-transparent px-1.5 py-px font-normal leading-[normal] text-muted [box-shadow:none] [column-gap:normal] [row-gap:normal] sm:size-8.5"
                data-testid="cd-menu"
                isIconOnly
                variant="ghost"
              >
                <MoreHorizontal className="size-4.5" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  onAction={(key) => {
                    if (key === 'deactivate') {
                      setDeactivateOpen(true);
                    } else if (key === 'reactivate') {
                      updateClient({body: {status: 'active'}, id: client.id})
                        .unwrap()
                        .then(() => toast.success(`${client.first_name ?? 'Client'} is active again.`))
                        .catch(() => toast.danger("Client wasn't reactivated"));
                    } else if (key === 'edit') {
                      navigate(ROUTES.CLIENT_DETAILS.replace(':id', client.id));
                    }
                  }}
                >
                  <Dropdown.Item
                    id="edit"
                    textValue="Details & settings"
                  >
                    <Label>Details &amp; settings</Label>
                  </Dropdown.Item>
                  {client.status === 'active' ? (
                    <Dropdown.Item
                      id="deactivate"
                      textValue="Deactivate client"
                      variant="danger"
                    >
                      <Label>Deactivate client</Label>
                    </Dropdown.Item>
                  ) : null}
                  {client.status === 'inactive' ? (
                    <Dropdown.Item
                      id="reactivate"
                      textValue="Reactivate client"
                    >
                      <Label>Reactivate client</Label>
                    </Dropdown.Item>
                  ) : null}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-3 sm:mt-1.5 sm:flex-nowrap sm:gap-5">
            <Avatar
              className="size-13 flex-none rounded-pill bg-accent font-bold text-heading [color:white] sm:size-16 sm:text-metric"
              color="accent"
              data-testid="cd-avatar"
            >
              <Avatar.Fallback className="rounded-pill bg-accent font-bold text-heading [color:white] sm:text-metric">
                {initials}
              </Avatar.Fallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2">
                {/* not Typography: the unlayered `.typography--h5` rule pins
                    letter-spacing -0.015em and beats any utility; the CD design
                    wants `normal` (style-diff pair `name`). */}
                <span
                  className="font-grotesk text-heading font-semibold sm:text-display"
                  data-testid="cd-name"
                >
                  {name}
                </span>
                <StatusChip status={client.status} />
              </div>
              <AttentionChips client={client} />
              <div
                className="mt-1.5 hidden items-center gap-1.5 text-eyebrow text-muted sm:flex"
                data-testid="cd-contact"
              >
                {client.email ? (
                  <>
                    <Mail className="size-3.5" />
                    {client.email}
                  </>
                ) : null}
                {client.email && client.phone ? <span className="opacity-50">·</span> : null}
                {client.phone ? (
                  <>
                    <Phone className="size-3.5" />
                    {client.phone}
                  </>
                ) : null}
              </div>
              <div
                className="mt-1 text-eyebrow text-muted sm:hidden"
                data-testid="cd-since"
              >
                Client since {formatShortDate(client.inserted_at)}
              </div>
            </div>
            <div className="mt-3 flex w-full gap-2 sm:mt-0 sm:w-auto sm:flex-none sm:items-center sm:gap-2">
              {isPending ? null : (
                <Button
                  className="relative h-9.5 flex-1 gap-2 rounded-panel px-4 font-btn text-body font-bold leading-none [color:white] [box-shadow:none] sm:h-10 sm:flex-none"
                  data-testid="cd-message"
                  onPress={() => navigate(ROUTES.CLIENT_MESSAGES.replace(':id', client.id))}
                  variant="primary"
                >
                  <MessageCircle className="size-4 sm:size-4.25" />
                  Message
                  {unread > 0 ? (
                    <span
                      className="absolute -top-1.5 -right-1.5 h-4.75 min-w-4.75 rounded-pill border-2 border-surface bg-danger px-1 text-center font-btn text-eyebrow font-bold leading-cbadge [color:white]"
                      data-testid="cd-msg-badge"
                    >
                      {unread}
                    </span>
                  ) : null}
                </Button>
              )}
              {client.phone ? (
                <a
                  aria-label="Call"
                  className="flex size-9.5 flex-none items-center justify-center rounded-panel border border-border bg-surface text-foreground sm:size-10"
                  data-testid="cd-call"
                  href={`tel:${client.phone}`}
                >
                  <Phone className="size-4 sm:size-4.25" />
                </a>
              ) : null}
            </div>
          </div>

          {isPending ? (
            <div className="pt-3" />
          ) : (
            <>
              <StatStrip client={client} />
              <Tabs
                onSelectionChange={(key) =>
                  setSearchParams(key === 'overview' ? {} : {tab: String(key)}, {replace: true})
                }
                selectedKey={tab}
              >
                <Tabs.List
                  aria-label="Client sections"
                  className="mt-3 flex gap-0 border-0 bg-transparent p-0 sm:mt-4 sm:gap-6"
                >
                  {TAB_IDS.map((tabId) => (
                    <Tabs.Tab
                      className={TAB_CLASS}
                      data-testid={tab === tabId ? 'cd-tab-active' : 'cd-tab-idle'}
                      id={tabId}
                      key={tabId}
                    >
                      {tabId === 'check-ins' ? 'Check-ins' : tabId.charAt(0).toUpperCase() + tabId.slice(1)}
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
              </Tabs>
            </>
          )}
        </div>

        {/* ── body ────────────────────────────────────────────────────── */}
        <div className="text-foreground [line-height:normal] sm:px-8 sm:pt-6 sm:pb-8">
          {client.status === 'inactive' ? (
            <div className="p-3 pb-0 sm:p-0">
              <StateBanner client={client} />
            </div>
          ) : null}
          {isPending ? (
            <PendingBody
              client={client}
              detailsRow={<DetailsRow />}
              notesCard={<NotesCard client={client} />}
            />
          ) : tab === 'overview' ? (
            <OverviewTab
              client={client}
              isFresh={isFresh}
            />
          ) : (
            <div className="flex flex-col gap-3 p-3 sm:gap-3 sm:p-0">
              {tab === 'training' ? <TrainingTab client={client} /> : null}
              {tab === 'nutrition' ? <NutritionTab client={client} /> : null}
              {tab === 'check-ins' ? <CheckinsTab client={client} /> : null}
            </div>
          )}
        </div>
      </Page.Content>

      <AlertDialog.Backdrop
        isOpen={isDeactivateOpen}
        onOpenChange={setDeactivateOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-100">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Deactivate {client.first_name ?? 'client'}?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Typography>They&apos;ll lose access to the app until you reactivate them.</Typography>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={isDeactivating}
                onPress={() => setDeactivateOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                isPending={isDeactivating}
                onPress={deactivate}
                variant="danger"
              >
                Deactivate
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </Page>
  );
}
