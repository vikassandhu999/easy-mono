/**
 * THROWAWAY PROTOTYPE — Onboarding queue interaction.
 *
 * Three variants on the existing workbench route, switchable with
 * `?view=new&variant=A|B|C`. Sample reason data and every action are local.
 * The prototype tests lifecycle-gated invitation/intake work, outbound-contact
 * confirmation, and what remains after each follow-up.
 */
import {getInitials} from '@easy/utils';
import {
  Alert,
  AlertDialog,
  Avatar,
  Button,
  Chip,
  Description,
  Label,
  Separator,
  Surface,
  Typography,
} from '@heroui/react';
import {cn} from '@heroui/styles';
import {CheckCircle2, ClipboardList, Mail, MessageCircle, Phone, RotateCcw, UserRound} from 'lucide-react';
import {Fragment, useState} from 'react';
import {GridListItem} from 'react-aria-components';
import {useSearchParams} from 'react-router-dom';

import BrowseListBox, {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import {EmptyState} from '@/@components/empty-state';
import {requirePrimaryReason} from '@/clients/lib/workbench-programming';
import {ViewShell} from '@/clients/workbench/view-shell';

import {PrototypeSwitcher} from './prototype-switcher';

type InvitationReason = {
  code: 'invitation_follow_up_due';
  followUpDueAt: string;
  invitationId: string;
  sentAt: string;
};

type IntakeReason = {
  assignmentId: string;
  code: 'intake_overdue';
  dueOn: string;
  formTitle: string;
};

type OnboardingReason = IntakeReason | InvitationReason;

type OnboardingClient = {
  email: string;
  id: string;
  joinedAt?: string;
  name: string;
  phone?: string;
  reasons: OnboardingReason[];
};

type ActionState = {
  description: string;
  title: string;
};

type PendingReasonAction = {
  client: OnboardingClient;
  reason: OnboardingReason;
};

const INITIAL_CLIENTS: OnboardingClient[] = [
  {
    email: 'maya.chen@example.com',
    id: 'maya-chen',
    joinedAt: '2026-07-28T10:00:00Z',
    name: 'Maya Chen',
    reasons: [
      {
        assignmentId: 'intake-maya',
        code: 'intake_overdue',
        dueOn: '2026-08-05',
        formTitle: 'Getting started intake',
      },
    ],
  },
  {
    email: 'theo.grant@example.com',
    id: 'theo-grant',
    name: 'Theo Grant',
    phone: '+919876543210',
    reasons: [
      {
        code: 'invitation_follow_up_due',
        followUpDueAt: '2026-08-06T09:30:00Z',
        invitationId: 'invite-theo',
        sentAt: '2026-08-03T09:30:00Z',
      },
      {
        assignmentId: 'intake-theo',
        code: 'intake_overdue',
        dueOn: '2026-08-08',
        formTitle: 'Coaching intake',
      },
    ],
  },
  {
    email: 'priya.shah@example.com',
    id: 'priya-shah',
    joinedAt: '2026-07-30T14:00:00Z',
    name: 'Priya Shah',
    phone: '+919812345678',
    reasons: [
      {
        assignmentId: 'intake-priya',
        code: 'intake_overdue',
        dueOn: '2026-08-07',
        formTitle: 'Nutrition intake',
      },
    ],
  },
  {
    email: 'lucas.martin@example.com',
    id: 'lucas-martin',
    name: 'Lucas Martin',
    reasons: [
      {
        code: 'invitation_follow_up_due',
        followUpDueAt: '2026-08-10T11:00:00Z',
        invitationId: 'invite-lucas',
        sentAt: '2026-08-07T11:00:00Z',
      },
    ],
  },
];

const VARIANTS = [
  {id: 'A', label: 'Action checklist'},
  {id: 'B', label: 'Compact queue row'},
  {id: 'C', label: 'Client focus pane'},
];

function dueAt(reason: OnboardingReason): string {
  return reason.code === 'intake_overdue' ? reason.dueOn : reason.followUpDueAt;
}

function reasonTitle(reason: OnboardingReason): string {
  return reason.code === 'intake_overdue' ? 'Intake overdue' : 'Invitation follow-up due';
}

function reasonDescription(reason: OnboardingReason): string {
  if (reason.code === 'intake_overdue') {
    return `${reason.formTitle} · due ${formatDate(reason.dueOn)}`;
  }
  return `Sent ${formatDate(reason.sentAt)} · follow-up due ${formatDate(reason.followUpDueAt)}`;
}

function reasonAction(reason: OnboardingReason): string {
  return reason.code === 'intake_overdue' ? 'Send reminder' : 'Resend invitation';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', timeZone: 'UTC'}).format(
    new Date(value.length === 10 ? `${value}T00:00:00Z` : value),
  );
}

function orderedClients(clients: OnboardingClient[]): OnboardingClient[] {
  return clients
    .map((client) => ({
      ...client,
      reasons: client.reasons
        .filter((reason) =>
          client.joinedAt ? reason.code === 'intake_overdue' : reason.code === 'invitation_follow_up_due',
        )
        .sort((a, b) => dueAt(a).localeCompare(dueAt(b))),
    }))
    .filter((client) => client.reasons.length > 0)
    .sort((a, b) => dueAt(requirePrimaryReason(a.reasons)).localeCompare(dueAt(requirePrimaryReason(b.reasons))));
}

function ReasonChip({reason}: {reason: OnboardingReason}) {
  return (
    <Chip
      color={reason.code === 'intake_overdue' ? 'warning' : 'accent'}
      size="sm"
      variant="soft"
    >
      {reason.code === 'intake_overdue' ? <ClipboardList /> : <Mail />}
      {reasonTitle(reason)}
    </Chip>
  );
}

function ClientIdentity({client}: {client: OnboardingClient}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar
        className="size-9 shrink-0"
        size="md"
      >
        <Avatar.Fallback className="bg-accent-soft type-eyebrow font-semibold text-accent">
          {getInitials(...client.name.split(' '))}
        </Avatar.Fallback>
      </Avatar>
      <div className="min-w-0">
        <Label className="block truncate type-body font-semibold text-foreground">{client.name}</Label>
        <Description className="truncate type-eyebrow text-muted">{client.email}</Description>
      </div>
    </div>
  );
}

function CallButton({client, onCall}: {client: OnboardingClient; onCall: (client: OnboardingClient) => void}) {
  return client.phone ? (
    <Button
      aria-label={`Call ${client.name}`}
      isIconOnly
      onPress={() => onCall(client)}
      size="sm"
      variant="outline"
    >
      <Phone />
    </Button>
  ) : null;
}

type VariantProps = {
  clients: OnboardingClient[];
  onCall: (client: OnboardingClient) => void;
  onClientOpen: (client: OnboardingClient) => void;
  onIntakeOpen: (client: OnboardingClient, reason: IntakeReason) => void;
  onReasonAction: (client: OnboardingClient, reason: OnboardingReason) => void;
};

function QueueEmpty() {
  return (
    <EmptyState
      body="Invitations return after their new follow-up date only if still pending. Intakes leave when completed or dismissed."
      icon={CheckCircle2}
      title="Onboarding is clear"
    />
  );
}

function VariantA({clients, onCall, onClientOpen, onIntakeOpen, onReasonAction}: VariantProps) {
  return (
    <BrowseListBox
      ariaLabel="Prototype Onboarding action checklist"
      className="gap-3 bg-transparent p-0"
      emptyState={<QueueEmpty />}
      fetchNextPage={() => undefined}
      grid
      isLoading={false}
      items={clients}
      renderItem={(client) => {
        const merged = cn(
          LIST_ITEM_CLASS,
          'group list-box-item mt-0 flex flex-col gap-3 rounded-card border border-border p-4 hover:border-accent/50 hover:bg-surface',
        );

        return (
          <GridListItem
            {...(merged ? {className: merged} : {})}
            id={client.id}
            key={client.id}
            onAction={() => onClientOpen(client)}
            textValue={client.name}
          >
            <span
              aria-hidden
              className="absolute inset-y-3 start-1 w-0.75 rounded-pill bg-transparent group-hover:bg-accent group-focus-visible:bg-accent"
            />
            <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <ClientIdentity client={client} />
              <span className="flex items-center gap-2">
                <CallButton
                  client={client}
                  onCall={onCall}
                />
                <Typography
                  color="muted"
                  type="body-xs"
                  weight="semibold"
                >
                  {client.reasons.length} {client.reasons.length === 1 ? 'action' : 'actions'}
                </Typography>
              </span>
            </div>

            <Surface className="w-full overflow-hidden rounded-control border border-border bg-surface">
              {client.reasons.map((reason, index) => (
                <Fragment key={reason.code === 'intake_overdue' ? reason.assignmentId : reason.invitationId}>
                  {index > 0 ? <Separator /> : null}
                  <div
                    className={cn(
                      'flex flex-col gap-3 p-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center',
                      index === 0 && 'bg-surface-secondary',
                    )}
                  >
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <Typography
                        className={index === 0 ? 'text-accent' : 'text-muted'}
                        type="body-xs"
                        weight="semibold"
                      >
                        {index === 0 ? 'Next action' : 'Also due'}
                      </Typography>
                      <ReasonChip reason={reason} />
                      <Typography
                        color="muted"
                        type="body-xs"
                      >
                        {reasonDescription(reason)}
                      </Typography>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      {reason.code === 'intake_overdue' ? (
                        <Button
                          onPress={() => onIntakeOpen(client, reason)}
                          size="sm"
                          variant="ghost"
                        >
                          View intake
                        </Button>
                      ) : null}
                      <Button
                        onPress={() => onReasonAction(client, reason)}
                        size="sm"
                        variant={index === 0 ? 'primary' : 'outline'}
                      >
                        {reason.code === 'intake_overdue' ? <MessageCircle /> : <Mail />}
                        {reasonAction(reason)}
                      </Button>
                    </div>
                  </div>
                </Fragment>
              ))}
            </Surface>
          </GridListItem>
        );
      }}
    />
  );
}

function VariantB({clients, onCall, onClientOpen, onReasonAction}: VariantProps) {
  return (
    <BrowseListBox
      ariaLabel="Prototype Onboarding oldest task first"
      className="gap-0 p-0"
      emptyState={<QueueEmpty />}
      fetchNextPage={() => undefined}
      grid
      isLoading={false}
      items={clients}
      renderItem={(client) => {
        const primary = requirePrimaryReason(client.reasons);
        const merged = cn(
          LIST_ITEM_CLASS,
          'list-box-item mt-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-4',
        );

        return (
          <GridListItem
            {...(merged ? {className: merged} : {})}
            id={client.id}
            key={client.id}
            onAction={() => onClientOpen(client)}
            textValue={client.name}
          >
            <Avatar
              className="size-9 shrink-0"
              size="md"
            >
              <Avatar.Fallback className="bg-warning-soft type-eyebrow font-semibold text-warning-text">
                {getInitials(...client.name.split(' '))}
              </Avatar.Fallback>
            </Avatar>

            <div className="min-w-0">
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <Label className="truncate type-body font-semibold text-foreground">{client.name}</Label>
                <ReasonChip reason={primary} />
              </span>
              <Description className="block truncate type-eyebrow text-muted">{reasonDescription(primary)}</Description>
            </div>

            <div className="col-span-2 flex flex-wrap justify-end gap-2 sm:col-span-1">
              <CallButton
                client={client}
                onCall={onCall}
              />
              <Button
                onPress={() => onReasonAction(client, primary)}
                size="sm"
                variant="outline"
              >
                {reasonAction(primary)}
              </Button>
            </div>
          </GridListItem>
        );
      }}
    />
  );
}

function VariantC({clients, onCall, onClientOpen, onIntakeOpen, onReasonAction}: VariantProps) {
  const [selectedId, setSelectedId] = useState(clients[0]?.id ?? '');
  const selected = clients.find((client) => client.id === selectedId) ?? clients[0];
  const items = clients.map((client) => ({...client, isSelected: client.id === selected?.id}));

  if (!selected) {
    return <QueueEmpty />;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-5">
      <BrowseListBox
        ariaLabel="Prototype Onboarding client selector"
        className="gap-0 p-0 lg:col-span-2"
        emptyState={<QueueEmpty />}
        fetchNextPage={() => undefined}
        grid
        isLoading={false}
        items={items}
        renderItem={(client) => {
          const merged = cn(
            LIST_ITEM_CLASS,
            'list-box-item mt-0 flex items-center gap-3 py-3 sm:px-4',
            client.isSelected && 'bg-accent-soft',
          );

          return (
            <GridListItem
              {...(client.isSelected ? {'aria-current': 'true' as const} : {})}
              {...(merged ? {className: merged} : {})}
              id={client.id}
              key={client.id}
              onAction={() => setSelectedId(client.id)}
              textValue={client.name}
            >
              <Avatar
                className="size-9 shrink-0"
                size="md"
              >
                <Avatar.Fallback>{getInitials(...client.name.split(' '))}</Avatar.Fallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Label className="block truncate type-body font-semibold text-foreground">{client.name}</Label>
                <Description className="truncate type-eyebrow text-muted">
                  {client.reasons.length} {client.reasons.length === 1 ? 'action' : 'actions'} · oldest{' '}
                  {formatDate(dueAt(requirePrimaryReason(client.reasons)))}
                </Description>
              </div>
            </GridListItem>
          );
        }}
      />

      <Surface className="flex flex-col gap-4 rounded-card border border-border p-4 lg:col-span-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <ClientIdentity client={selected} />
          <span className="flex items-center gap-2">
            <CallButton
              client={selected}
              onCall={onCall}
            />
            <Button
              onPress={() => onClientOpen(selected)}
              size="sm"
              variant="ghost"
            >
              <UserRound /> View client
            </Button>
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {selected.reasons.map((reason, index) => {
            const surfaceClassName = cn(
              'flex flex-col gap-3 rounded-control border p-3',
              index === 0 ? 'border-accent bg-accent-soft' : 'border-border bg-surface-secondary',
            );

            return (
              <Surface
                {...(surfaceClassName ? {className: surfaceClassName} : {})}
                key={reason.code === 'intake_overdue' ? reason.assignmentId : reason.invitationId}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <ReasonChip reason={reason} />
                  <Typography
                    color="muted"
                    type="body-xs"
                    weight="semibold"
                  >
                    {index === 0 ? 'Do next' : `Then ${index + 1}`}
                  </Typography>
                </div>
                <Typography
                  color="muted"
                  type="body-sm"
                >
                  {reasonDescription(reason)}
                </Typography>
                <div className="flex flex-wrap justify-end gap-2">
                  {reason.code === 'intake_overdue' ? (
                    <Button
                      onPress={() => onIntakeOpen(selected, reason)}
                      size="sm"
                      variant="ghost"
                    >
                      View intake
                    </Button>
                  ) : null}
                  <Button
                    onPress={() => onReasonAction(selected, reason)}
                    size="sm"
                    variant={index === 0 ? 'primary' : 'outline'}
                  >
                    {reasonAction(reason)}
                  </Button>
                </div>
              </Surface>
            );
          })}
        </div>
      </Surface>
    </div>
  );
}

function StateInspector({
  clients,
  onReset,
  state,
}: {
  clients: OnboardingClient[];
  onReset: () => void;
  state: ActionState;
}) {
  const actionCount = clients.reduce((total, client) => total + client.reasons.length, 0);
  return (
    <Alert
      color="accent"
      status="accent"
    >
      <Alert.Content>
        <Alert.Title>{state.title}</Alert.Title>
        <Alert.Description>
          {state.description} Current state: {clients.length} clients · {actionCount} outstanding actions.
        </Alert.Description>
      </Alert.Content>
      <Button
        aria-label="Reset Onboarding prototype state"
        isIconOnly
        onPress={onReset}
        size="sm"
        variant="ghost"
      >
        <RotateCcw />
      </Button>
    </Alert>
  );
}

const INITIAL_STATE: ActionState = {
  description: 'Choose an action, review its confirmation, and watch what remains.',
  title: 'Prototype state',
};

export default function OnboardingQueuePrototype() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedVariant = searchParams.get('variant');
  const variant = VARIANTS.some((candidate) => candidate.id === requestedVariant) ? requestedVariant! : 'B';
  const [clients, setClients] = useState(INITIAL_CLIENTS);
  const [pendingAction, setPendingAction] = useState<PendingReasonAction | null>(null);
  const [state, setState] = useState<ActionState>(INITIAL_STATE);
  const ordered = orderedClients(clients);

  const updateVariant = (next: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('variant', next);
    setSearchParams(params, {replace: true});
  };

  const reset = () => {
    setClients(INITIAL_CLIENTS);
    setPendingAction(null);
    setState(INITIAL_STATE);
  };

  const openClient = (client: OnboardingClient) => {
    setState({
      description: `This would open ${client.name}'s client overview without clearing any Onboarding reason.`,
      title: 'Client opened',
    });
  };

  const callClient = (client: OnboardingClient) => {
    if (client.phone) {
      window.location.href = `tel:${client.phone}`;
    }
  };

  const openIntake = (client: OnboardingClient, reason: IntakeReason) => {
    setState({
      description: `This would open ${reason.formTitle} for ${client.name}. Viewing it does not clear the overdue reason.`,
      title: 'Intake opened',
    });
  };

  const actOnReason = (client: OnboardingClient, reason: OnboardingReason) => {
    if (reason.code === 'intake_overdue') {
      setState({
        description: `A reminder was sent to ${client.name}. The intake remains overdue until it is completed or dismissed.`,
        title: 'Reminder sent',
      });
      return;
    }

    const nextClients = clients.flatMap((candidate) => {
      if (candidate.id !== client.id) {
        return [candidate];
      }
      const reasons = candidate.reasons.filter(
        (candidateReason) =>
          candidateReason.code !== 'invitation_follow_up_due' || candidateReason.invitationId !== reason.invitationId,
      );
      return reasons.length > 0 ? [{...candidate, reasons}] : [];
    });
    const remains = orderedClients(nextClients).some((candidate) => candidate.id === client.id);
    setClients(nextClients);
    setState({
      description: remains
        ? `${client.name}'s follow-up clock reset to three days from now. The current invitation follow-up reason cleared.`
        : `${client.name}'s follow-up clock reset to three days from now, so the client left Onboarding until another action is due.`,
      title: 'Invitation resent',
    });
  };

  const confirmReasonAction = () => {
    if (!pendingAction) {
      return;
    }
    const {client, reason} = pendingAction;
    setPendingAction(null);
    actOnReason(client, reason);
  };

  const props: VariantProps = {
    clients: ordered,
    onCall: callClient,
    onClientOpen: openClient,
    onIntakeOpen: openIntake,
    onReasonAction: (client, reason) => setPendingAction({client, reason}),
  };

  const actionCount = ordered.reduce((total, client) => total + client.reasons.length, 0);

  return (
    <div className="flex flex-col gap-3 pb-20">
      <ViewShell
        meta={`${ordered.length} clients · ${actionCount} actions, oldest due first`}
        title="Onboarding · prototype"
        toolbar={
          <Typography
            color="muted"
            type="body-xs"
          >
            {variant === 'B'
              ? 'Each eligible task stays visible. Outbound contact asks for confirmation.'
              : 'Invitation resend clears only that reason. Intake reminders do not complete intake work.'}
          </Typography>
        }
      >
        {variant === 'A' ? <VariantA {...props} /> : null}
        {variant === 'B' ? <VariantB {...props} /> : null}
        {variant === 'C' ? <VariantC {...props} /> : null}
      </ViewShell>

      <AlertDialog.Backdrop
        isOpen={pendingAction !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPendingAction(null);
          }
        }}
        variant="transparent"
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>
                {pendingAction?.reason.code === 'intake_overdue' ? 'Send intake reminder?' : 'Resend invitation?'}
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              {pendingAction?.reason.code === 'intake_overdue'
                ? `Remind ${pendingAction.client.name} to complete “${pendingAction.reason.formTitle},” due ${formatDate(pendingAction.reason.dueOn)}. Sending a reminder will not mark the intake complete.`
                : pendingAction
                  ? `Send another invitation to ${pendingAction.client.name} at ${pendingAction.client.email}? This restarts the three-day follow-up clock.`
                  : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                slot="close"
                variant="tertiary"
              >
                Cancel
              </Button>
              <Button
                onPress={confirmReasonAction}
                variant="primary"
              >
                {pendingAction ? reasonAction(pendingAction.reason) : 'Confirm'}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>

      <StateInspector
        clients={ordered}
        onReset={reset}
        state={state}
      />

      <PrototypeSwitcher
        current={variant}
        onChange={updateVariant}
        variants={VARIANTS}
      />
    </div>
  );
}
