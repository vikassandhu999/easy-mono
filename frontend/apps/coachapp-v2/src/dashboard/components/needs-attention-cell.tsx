import {Avatar, Typography} from '@heroui/react';
import {ChevronRight, ClipboardCheck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import {clientInitials, clientName} from '@/dashboard/lib/client-format';

type Reason = {
  key: 'expiring_soon' | 'intake_incomplete' | 'needs_plan';
  label: string;
};

const REASONS: Reason[] = [
  {key: 'intake_incomplete', label: 'Intake incomplete'},
  {key: 'needs_plan', label: 'Needs plan'},
  {key: 'expiring_soon', label: 'Expiring soon'},
];

function AttentionClientRow({client, reason}: {client: Client; reason: string}) {
  const navigate = useNavigate();

  return (
    <button
      className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      onClick={() => navigate(ROUTES.CLIENT_DETAIL.replace(':id', client.id))}
      type="button"
    >
      <Avatar size="sm">
        <Avatar.Fallback>{clientInitials(client)}</Avatar.Fallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{clientName(client)}</span>
        <span className="block truncate text-xs text-muted">{reason}</span>
      </span>
      <ChevronRight
        className="shrink-0 text-muted"
        size={16}
      />
    </button>
  );
}

function CheckInReviewRow({count, isError}: {count: null | number; isError: boolean}) {
  const navigate = useNavigate();
  let status = 'Loading review queue';

  if (isError) {
    status = 'Review queue unavailable';
  } else if (count !== null) {
    status = `${count} ${count === 1 ? 'submission' : 'submissions'} waiting`;
  }

  return (
    <button
      className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      onClick={() => navigate(ROUTES.CHECKINS_TO_REVIEW)}
      type="button"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-hover text-muted">
        <ClipboardCheck size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">Check-ins to review</span>
        <span className="block truncate text-xs text-muted">{status}</span>
      </span>
      <ChevronRight
        className="shrink-0 text-muted"
        size={16}
      />
    </button>
  );
}

type NeedsAttentionCellProps = {
  clients: Client[];
  isError: boolean;
  reviewCount: null | number;
  reviewError: boolean;
};

export function NeedsAttentionCell({clients, isError, reviewCount, reviewError}: NeedsAttentionCellProps) {
  const previewClients = REASONS.flatMap((reason) =>
    clients.filter((client) => client[reason.key]).map((client) => ({client, reason: reason.label})),
  )
    .filter(({client}, index, rows) => rows.findIndex((row) => row.client.id === client.id) === index)
    .slice(0, 3);

  return (
    <section className="flex flex-col gap-3">
      <Typography
        className="uppercase tracking-wider"
        color="muted"
        type="body-xs"
        weight="semibold"
      >
        Client follow-ups
      </Typography>
      <div>
        {isError || reviewError ? (
          <p className="mb-2 text-xs text-danger-soft-foreground">Some follow-ups couldn't be loaded.</p>
        ) : null}
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          <CheckInReviewRow
            count={reviewCount}
            isError={reviewError}
          />
          {previewClients.map(({client, reason}) => (
            <AttentionClientRow
              client={client}
              key={client.id}
              reason={reason}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
