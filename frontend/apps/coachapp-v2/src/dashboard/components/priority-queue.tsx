import type {Key} from '@heroui/react';

import {Avatar, Button, Chip, Description, Label, ListBox, Typography} from '@heroui/react';
import {cn} from '@heroui/styles';
import {ArrowRight, ClipboardCheck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import type {Prospect} from '@/api/prospects';
import {DashboardSectionHeading} from '@/dashboard/components/dashboard-section-heading';
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

// GAPS #2: severity is carried by the status `Chip` (danger / warning / accent),
// never by a coloured left stripe — the stripe is the prototype's shorthand, not
// a token pattern. The avatar tint is the row's only other severity cue.
const AVATAR_TONE: Record<Tone, string> = {
  accent: 'bg-accent-soft text-accent',
  danger: 'bg-danger-soft text-danger',
  default: 'bg-surface-secondary text-muted',
  warning: 'bg-warning-soft text-warning-text',
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
    <ListBox.Item
      className={cn(
        LIST_ITEM_CLASS,
        'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-none border-b border-separator py-3',
        'last:border-0 hover:bg-surface-secondary sm:gap-4 sm:px-4',
      )}
      id={item.id}
      textValue={item.name}
    >
      <Avatar
        className="size-9 shrink-0"
        size="md"
      >
        {/* The tint has to sit on `Avatar.Fallback` — `Avatar`'s own background
            class wins on the root and the tone would be painted over. */}
        <Avatar.Fallback className={cn('text-xs font-semibold', AVATAR_TONE[item.tone])}>
          {item.initials}
        </Avatar.Fallback>
      </Avatar>

      <div className="flex min-w-0 flex-col">
        <span className="flex min-w-0 items-center gap-2">
          <Label className="min-w-0 truncate text-sm font-semibold text-foreground">{item.name}</Label>
          <Chip
            className="shrink-0"
            color={item.tone}
            size="sm"
            variant={item.chipVariant}
          >
            {item.chip}
          </Chip>
        </span>
        <Description className="max-w-full truncate text-xs text-muted">{item.subtitle}</Description>
      </div>

      <Button
        className="min-h-11 shrink-0"
        onPress={item.onOpen}
        size="sm"
        variant="outline"
      >
        {item.action}
      </Button>
    </ListBox.Item>
  );
}

/** The ink hero row above the queue — COPY.md §DB `{n} check-ins to review`. */
function ReviewBanner({
  count,
  names,
  oldestDays,
  oldestId,
}: {
  count: number;
  names: string;
  oldestDays: null | number;
  oldestId: null | string;
}) {
  const navigate = useNavigate();
  const subtitle = [
    oldestDays === null ? null : `Oldest waiting ${oldestDays} day${oldestDays === 1 ? '' : 's'}`,
    names,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex items-center gap-4 rounded-card bg-ink px-5 py-4 text-ink-foreground">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface/10">
        <ClipboardCheck className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <Typography
          className="font-grotesk text-ink-foreground"
          type="h6"
        >
          {count} check-in{count === 1 ? '' : 's'} to review
        </Typography>
        {subtitle ? (
          <Typography
            // Wraps rather than truncates: at 390px the names list is the point
            // of the line, and an ellipsis would eat all of it.
            className="max-w-full text-ink-foreground/60"
            type="body-xs"
          >
            {subtitle}
          </Typography>
        ) : null}
      </div>
      <Button
        className="min-h-11 shrink-0 text-foreground"
        isDisabled={oldestId === null}
        onPress={() => oldestId && navigate(ROUTES.CHECKIN_REVIEW.replace(':id', oldestId))}
        size="sm"
        variant="secondary"
      >
        Review
        <ArrowRight className="size-4" />
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
  reviewNames?: string;
  reviewOldestDays?: null | number;
  reviewOldestId?: null | string;
};

export function PriorityQueue({
  clients,
  isError,
  prospects,
  reviewCount,
  reviewError,
  reviewNames = '',
  reviewOldestDays = null,
  reviewOldestId = null,
}: PriorityQueueProps) {
  const navigate = useNavigate();
  const items = buildItems(clients, prospects, navigate).slice(0, 6);
  const byId = new Map(items.map((item) => [item.id, item]));
  const hasReviews = !reviewError && reviewCount !== null && reviewCount > 0;
  const total = items.length + (hasReviews ? 1 : 0);

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <DashboardSectionHeading
        aside={
          total > 1 ? (
            <Typography
              className="shrink-0"
              color="muted"
              type="body-xs"
            >
              Sorted by priority
            </Typography>
          ) : null
        }
        count={total > 0 ? `${total} ${total === 1 ? 'item' : 'items'}` : null}
        title="Needs you today"
      />

      {isError && !hasReviews && items.length === 0 ? (
        <div className="rounded-card border border-border bg-surface px-5 py-8 text-center">
          <Typography
            color="muted"
            type="body-sm"
          >
            Couldn't load your queue. Check your connection and try again.
          </Typography>
        </div>
      ) : null}

      {hasReviews ? (
        <ReviewBanner
          count={reviewCount}
          names={reviewNames}
          oldestDays={reviewOldestDays}
          oldestId={reviewOldestId}
        />
      ) : null}

      {items.length > 0 ? (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <ListBox
            aria-label="Needs you today"
            className="gap-0 p-0"
            onAction={(key: Key) => byId.get(String(key))?.onOpen()}
            selectionMode="none"
          >
            {items.map((item) => (
              <QueueRow
                item={item}
                key={item.id}
              />
            ))}
          </ListBox>
          <Button
            className="min-h-11 w-full rounded-none border-t border-separator text-accent"
            onPress={() => navigate(ROUTES.CLIENTS)}
            size="sm"
            variant="ghost"
          >
            View all clients
          </Button>
        </div>
      ) : null}

      {!hasReviews && items.length === 0 && !isError ? (
        <div className="rounded-card border border-border bg-surface px-5 py-7">
          <Typography type="body">You're all caught up</Typography>
          <Typography
            className="mt-1"
            color="muted"
            type="body-sm"
          >
            Check-ins, expiring plans, and new leads will show up here.
          </Typography>
        </div>
      ) : null}
    </section>
  );
}
