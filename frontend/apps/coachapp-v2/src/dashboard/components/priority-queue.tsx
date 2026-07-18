import {Button, Chip} from '@heroui/react';
import {ArrowRight, ClipboardCheck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import type {Prospect} from '@/api/prospects';
import {clientInitials, clientName} from '@/dashboard/lib/client-format';
import {formatDaysUntil, formatRelativeTime} from '@/dashboard/lib/date-format';

type Tone = 'accent' | 'danger' | 'default' | 'warning';

type QueueItem = {
  action: string;
  chip: string;
  chipVariant: 'primary' | 'soft';
  id: string;
  initials: string;
  name: string;
  onOpen: () => void;
  subtitle: string;
  tone: Tone;
};

const AVATAR_TONE: Record<Tone, string> = {
  accent: 'bg-accent-soft text-accent',
  danger: 'bg-danger-soft text-danger',
  default: 'bg-surface-tertiary text-muted',
  warning: 'bg-warning-soft text-warning-soft-foreground',
};

const STRIPE_TONE: Record<Tone, string> = {
  accent: 'bg-accent',
  danger: 'bg-danger',
  default: 'bg-border',
  warning: 'bg-warning',
};

function buildItems(clients: Client[], prospects: Prospect[], navigate: (to: string) => void): QueueItem[] {
  const clientPath = (client: Client) => () => navigate(ROUTES.CLIENT_DETAIL.replace(':id', client.id));
  const seen = new Set<string>();
  const items: QueueItem[] = [];

  const pushClient = (client: Client, item: Omit<QueueItem, 'id' | 'initials' | 'name' | 'onOpen'>) => {
    if (seen.has(client.id)) {
      return;
    }
    seen.add(client.id);
    items.push({
      ...item,
      id: client.id,
      initials: clientInitials(client),
      name: clientName(client),
      onOpen: clientPath(client),
    });
  };

  // Ranked: expiring → needs plan → new leads → intake incomplete.
  for (const client of clients.filter((c) => c.expiring_soon)) {
    pushClient(client, {
      action: 'Renew',
      chip: 'Expiring',
      chipVariant: 'soft',
      subtitle: formatDaysUntil(client.subscription_ends_on),
      tone: 'danger',
    });
  }
  for (const client of clients.filter((c) => c.needs_plan)) {
    pushClient(client, {
      action: 'Assign',
      chip: 'Needs plan',
      chipVariant: 'soft',
      subtitle: 'No plan assigned yet',
      tone: 'warning',
    });
  }
  for (const prospect of prospects) {
    items.push({
      action: 'Review',
      chip: 'New lead',
      chipVariant: 'primary',
      id: `prospect-${prospect.id}`,
      initials: prospect.name[0]?.toUpperCase() ?? '?',
      name: prospect.name,
      onOpen: () => navigate(ROUTES.PROSPECT_DETAIL.replace(':id', prospect.id)),
      subtitle: [prospect.program?.name ?? 'New application', formatRelativeTime(prospect.inserted_at)]
        .filter(Boolean)
        .join(' · '),
      tone: 'accent',
    });
  }
  for (const client of clients.filter((c) => c.intake_incomplete)) {
    pushClient(client, {
      action: 'Nudge',
      chip: 'Intake',
      chipVariant: 'soft',
      subtitle: 'Intake form incomplete',
      tone: 'default',
    });
  }

  return items;
}

function QueueRow({item}: {item: QueueItem}) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-background">
      <button
        className="flex min-w-0 flex-1 items-center gap-3.5 self-stretch text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        onClick={item.onOpen}
        type="button"
      >
        <span className={`w-[3px] shrink-0 self-stretch rounded-full ${STRIPE_TONE[item.tone]}`} />
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${AVATAR_TONE[item.tone]}`}
        >
          {item.initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">{item.name}</span>
            <Chip
              color={item.tone}
              size="sm"
              variant={item.chipVariant}
            >
              {item.chip}
            </Chip>
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-muted">{item.subtitle}</span>
        </span>
      </button>
      <Button
        className="shrink-0"
        onPress={item.onOpen}
        size="sm"
        variant="outline"
      >
        {item.action}
      </Button>
    </div>
  );
}

type PriorityQueueProps = {
  clients: Client[];
  isError: boolean;
  prospects: Prospect[];
  reviewCount: null | number;
  reviewError: boolean;
};

export function PriorityQueue({clients, isError, prospects, reviewCount, reviewError}: PriorityQueueProps) {
  const navigate = useNavigate();
  const items = buildItems(clients, prospects, navigate).slice(0, 6);
  const hasReviews = !reviewError && reviewCount !== null && reviewCount > 0;
  const total = items.length + (hasReviews ? 1 : 0);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2.5">
          <h2 className="font-grotesk text-base font-semibold text-foreground">Needs you today</h2>
          {total > 0 ? (
            <span className="text-[13px] font-medium text-muted">
              {total} {total === 1 ? 'item' : 'items'}
            </span>
          ) : null}
        </div>
        {total > 1 ? <span className="text-xs text-muted">Sorted by priority</span> : null}
      </div>

      {isError && !hasReviews && items.length === 0 ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-5 py-8 text-center text-sm text-danger-soft-foreground">
          Couldn't load your queue. Check your connection and try again.
        </div>
      ) : null}

      {hasReviews ? (
        <button
          className="flex items-center gap-4 rounded-2xl bg-[var(--ink)] px-5 py-4 text-left text-white transition-transform hover:scale-[1.005]"
          onClick={() => navigate(ROUTES.CHECKINS_TO_REVIEW)}
          type="button"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <ClipboardCheck size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-grotesk text-[17px] font-semibold">
              {reviewCount} check-in{reviewCount === 1 ? '' : 's'} to review
            </span>
            <span className="mt-0.5 block text-[12.5px] text-white/60">
              {reviewCount === 1 ? 'A submission is waiting' : 'Submissions waiting on your review'}
            </span>
          </span>
          <span className="flex h-9 shrink-0 items-center gap-1.5 rounded-[11px] bg-white px-4 text-[13.5px] font-semibold text-foreground">
            Review
            <ArrowRight size={15} />
          </span>
        </button>
      ) : null}

      {items.length > 0 ? (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {items.map((item) => (
            <QueueRow
              item={item}
              key={item.id}
            />
          ))}
          <button
            className="flex w-full items-center justify-center py-3 text-[13px] font-semibold text-accent transition-colors hover:bg-background"
            onClick={() => navigate(ROUTES.CLIENTS)}
            type="button"
          >
            View all clients
          </button>
        </div>
      ) : null}

      {!hasReviews && items.length === 0 && !isError ? (
        <div className="rounded-2xl border border-success/20 bg-success-soft px-5 py-7">
          <p className="font-semibold text-success-soft-foreground">You're all caught up</p>
          <p className="mt-1 text-sm text-success-soft-foreground">
            Check-ins, expiring plans, and new leads will show up here.
          </p>
        </div>
      ) : null}
    </section>
  );
}
