import {Avatar} from '@heroui/react';
import {CalendarClock} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import {clientInitials, clientName} from '@/dashboard/lib/client-format';
import {formatDaysUntil, formatShortDate} from '@/dashboard/lib/date-format';

function SubscriptionClientCard({client}: {client: Client}) {
  const navigate = useNavigate();
  const name = clientName(client);

  return (
    <button
      className="flex min-h-24 flex-col justify-between rounded-card border border-border bg-surface p-3 text-left transition hover:-translate-y-0.5 hover:border-warning hover:shadow-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      onClick={() => navigate(ROUTES.CLIENT_DETAIL.replace(':id', client.id))}
      type="button"
    >
      <span className="flex min-w-0 items-center gap-3">
        <Avatar
          className="shrink-0 bg-accent text-accent-foreground"
          size="sm"
        >
          <Avatar.Fallback>{clientInitials(client)}</Avatar.Fallback>
        </Avatar>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="block text-xs text-muted">Ends {formatShortDate(client.subscription_ends_on)}</span>
        </span>
      </span>
      <span className="mt-3 flex items-center justify-between gap-3">
        <span
          className={`text-xs font-bold ${client.expiring_soon ? 'text-danger-soft-foreground' : 'text-warning-soft-foreground'}`}
        >
          {formatDaysUntil(client.subscription_ends_on)}
        </span>
        <span className="text-xs font-bold text-link">Open</span>
      </span>
    </button>
  );
}

export function SubscriptionsEndingCell({clients, isError}: {clients: Client[]; isError: boolean}) {
  const visibleClients = clients.slice(0, 4);

  return (
    <section className="col-span-2 rounded-card border border-border bg-surface p-5 sm:col-span-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-warning-soft text-warning">
            <CalendarClock size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="font-grotesk text-lg font-bold leading-tight">Subscriptions ending this month</h2>
            <p className="mt-1 text-xs text-muted">Reach out before they lapse</p>
          </div>
        </div>
        {!isError ? (
          <span className="w-fit rounded-full bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning-soft-foreground">
            {clients.length} ending
          </span>
        ) : null}
      </div>

      {isError ? (
        <div className="rounded-card border border-danger/20 bg-danger-soft p-4 text-sm text-danger-soft-foreground">
          Couldn't load subscriptions.
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-card border border-border p-4 text-sm text-muted">No subscriptions end this month.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {visibleClients.map((client) => (
            <SubscriptionClientCard
              client={client}
              key={client.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
