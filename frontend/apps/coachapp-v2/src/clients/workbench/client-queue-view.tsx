import {getInitials} from '@easy/utils';
import {ClipboardList, Moon, Timer, UserPlus} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox from '@/@components/browse-list-box';
import {EmptyState} from '@/@components/empty-state';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {type ClientQueue, useClientsInfiniteQuery} from '@/api/clients';
// The queue rows read the opt-in `*_plan_name` fields (`include_plans`), which
// the hand-written Client type deliberately omits — derive from the schema.
import type {components} from '@/api/schema';
import {formatRelativeTime, formatSubscriptionEnd} from '@/dashboard/lib/date-format';

import {QueueRow, type QueueRowItem, type QueueTone} from './queue-row';
import {SnoozeMenu} from './snooze-menu';

type QueueClient = components['schemas']['Client'];

const DAY_MS = 24 * 60 * 60 * 1000;

/** `covered_until` is a plain `YYYY-MM-DD`; whole days from today, negative when past. */
function daysUntil(dateString: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((new Date(`${dateString}T00:00:00`).getTime() - today) / DAY_MS);
}

function formatPlanEnd(coveredUntil: string): string {
  const days = daysUntil(coveredUntil);
  if (days < 0) {
    return 'Plan already ended';
  }
  if (days === 0) {
    return 'Plan ends today';
  }
  if (days === 1) {
    return 'Plan ends tomorrow';
  }
  return `Plan ends in ${days} days`;
}

type RowFacts = Pick<QueueRowItem, 'action' | 'subtitle' | 'tone'> & {to: string};

/** Per-discipline state — the fix differs, so the row says which side is missing (spec §3). */
function disciplineChips(client: QueueClient): string {
  const training = client.training_plan_name ? '✓' : '—';
  const nutrition = client.nutrition_plan_name ? '✓' : '—';
  return `Training ${training} · Nutrition ${nutrition}`;
}

function rowFacts(queue: ClientQueue, client: QueueClient): RowFacts {
  const detail = ROUTES.CLIENT_DETAIL.replace(':id', client.id);

  if (queue === 'programming') {
    return {
      action: 'Assign plan',
      subtitle: client.covered_until
        ? `${formatPlanEnd(client.covered_until)} · ${disciplineChips(client)}`
        : `No plan in force · ${disciplineChips(client)}`,
      to: `${detail}?tab=training`,
      tone: 'warning' satisfies QueueTone,
    };
  }

  if (queue === 'expiring') {
    return {
      action: 'Renew',
      subtitle: formatSubscriptionEnd(client.subscription_ends_on),
      to: ROUTES.CLIENT_EDIT.replace(':id', client.id),
      tone: 'danger',
    };
  }

  // `quiet`: missed their last two scheduled sessions, or their latest
  // check-in. Reaching out is the verb; `last_active_at` is display copy only.
  if (queue === 'quiet') {
    return {
      action: 'Message',
      subtitle: client.last_active_at ? `Last active ${formatRelativeTime(client.last_active_at)}` : 'No activity yet',
      to: ROUTES.CLIENT_MESSAGES.replace(':id', client.id),
      tone: 'danger',
    };
  }

  // `new`: invited, intake outstanding, or simply in their first two weeks.
  if (client.status === 'pending') {
    return {
      action: 'View',
      subtitle: `Invited ${formatRelativeTime(client.invitation_sent_at ?? client.inserted_at)}`,
      to: detail,
      tone: 'accent',
    };
  }
  if (client.intake_incomplete) {
    return {
      action: 'Nudge',
      subtitle: 'Intake form incomplete',
      to: ROUTES.CLIENT_MESSAGES.replace(':id', client.id),
      tone: 'default',
    };
  }
  return {
    action: 'View',
    subtitle: `Added ${formatRelativeTime(client.inserted_at)}`,
    to: detail,
    tone: 'accent',
  };
}

/**
 * Both empty messages at once — celebration first, the queue's definition as
 * the explainer — so the pane is honest whether the queue drained or never
 * filled (spec §7, collapsed for phase 1: the server doesn't say which).
 */
const EMPTY = {
  expiring: {
    body: 'Clients appear here a week before their subscription ends.',
    icon: Timer,
    title: 'No renewals due in the next 7 days',
  },
  new: {
    body: 'New and invited clients spend their first two weeks here.',
    icon: UserPlus,
    title: 'No one in onboarding right now',
  },
  programming: {
    body: 'Clients appear here when their plan is about to run out — before it does.',
    icon: ClipboardList,
    title: "Everyone's programmed",
  },
  quiet: {
    body: 'Clients appear here after missing their last two scheduled sessions, or a check-in. Rest days never count.',
    icon: Moon,
    title: "No one's gone quiet",
  },
} satisfies Record<ClientQueue, {body: string; icon: typeof Timer; title: string}>;

/** Only the two "not now" queues snooze (quiet-queue sub-spec). */
const SNOOZABLE: Partial<Record<ClientQueue, 'expiring' | 'quiet'>> = {
  expiring: 'expiring',
  quiet: 'quiet',
};

export default function ClientQueueView({queue}: {queue: ClientQueue}) {
  const navigate = useNavigate();
  const list = useInfiniteItems(useClientsInfiniteQuery({filter: queue}));
  const empty = EMPTY[queue];

  const snoozableQueue = SNOOZABLE[queue];

  const toRow = (client: QueueClient): QueueRowItem => {
    const facts = rowFacts(queue, client);
    return {
      action: facts.action,
      id: client.id,
      initials: getInitials(client.first_name, client.last_name) || '?',
      name: [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email || 'Client',
      onAction: () => navigate(facts.to),
      onOpen: () => navigate(ROUTES.CLIENT_DETAIL.replace(':id', client.id)),
      subtitle: facts.subtitle,
      tone: facts.tone,
      trailing: snoozableQueue ? (
        <SnoozeMenu
          clientId={client.id}
          queue={snoozableQueue}
        />
      ) : undefined,
    };
  };

  return (
    <BrowseListBox
      ariaLabel={`${queue} queue`}
      className="flex-1 gap-0 p-0"
      emptyState={
        <EmptyState
          body={empty.body}
          icon={empty.icon}
          title={empty.title}
        />
      }
      grid
      fetchNextPage={list.fetchNextPage}
      isError={list.isError}
      isLoading={list.isLoading || list.isFetchingNextPage}
      items={list.items}
      onRetry={list.refetch}
      renderItem={(client) => (
        <QueueRow
          item={toRow(client)}
          key={client.id}
        />
      )}
      skeletonAvatar
    />
  );
}
