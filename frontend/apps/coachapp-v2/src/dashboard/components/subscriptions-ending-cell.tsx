import {Avatar, Typography} from '@heroui/react';
import {ChevronRight} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import {clientInitials, clientName} from '@/dashboard/lib/client-format';
import {formatDaysUntil, formatShortDate} from '@/dashboard/lib/date-format';

function SubscriptionClientRow({client}: {client: Client}) {
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
        <span className="block text-xs text-muted">Ends {formatShortDate(client.subscription_ends_on)}</span>
      </span>
      <span className="shrink-0 text-xs font-medium text-muted">{formatDaysUntil(client.subscription_ends_on)}</span>
      <ChevronRight
        className="shrink-0 text-muted"
        size={16}
      />
    </button>
  );
}

export function SubscriptionsEndingCell({clients, isError}: {clients: Client[]; isError: boolean}) {
  return (
    <section className="flex flex-col gap-3">
      <Typography type="h5">Subscriptions ending this month</Typography>
      {isError ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-6 text-center text-sm text-danger-soft-foreground">
          Couldn't load subscriptions.
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
          No subscriptions end this month.
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {clients.slice(0, 4).map((client) => (
            <SubscriptionClientRow
              client={client}
              key={client.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
