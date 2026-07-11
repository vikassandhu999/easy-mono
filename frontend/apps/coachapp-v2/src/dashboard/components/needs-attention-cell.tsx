import {Avatar} from '@heroui/react';
import {AlertTriangle, ArrowRight} from 'lucide-react';
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
  const name = clientName(client);

  return (
    <button
      className="flex min-h-14 w-full items-center gap-3 border-t border-accent-foreground/10 py-3 text-left transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      onClick={() => navigate(ROUTES.CLIENT_DETAIL.replace(':id', client.id))}
      type="button"
    >
      <Avatar
        className="shrink-0 bg-accent-foreground text-accent"
        size="sm"
      >
        <Avatar.Fallback>{clientInitials(client)}</Avatar.Fallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{name}</span>
        <span className="block truncate text-xs text-accent-foreground/60">{reason}</span>
      </span>
      <ArrowRight
        className="shrink-0 text-accent-foreground/70"
        size={15}
      />
    </button>
  );
}

export function NeedsAttentionCell({clients, isError}: {clients: Client[]; isError: boolean}) {
  const uniqueClientCount = new Set(clients.map((client) => client.id)).size;
  const previewClients = REASONS.flatMap((reason) =>
    clients.filter((client) => client[reason.key]).map((client) => ({client, reason: reason.label})),
  ).filter(({client}, index, rows) => rows.findIndex((row) => row.client.id === client.id) === index);
  const visibleClients = previewClients.slice(0, 4);

  return (
    <section className="col-span-2 flex min-h-80 flex-col rounded-3xl border border-accent bg-accent p-5 text-accent-foreground sm:col-span-2 sm:row-span-2">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-danger-soft text-danger">
          <AlertTriangle size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-grotesk text-lg font-bold leading-tight">Needs attention</h2>
          <p className="mt-1 text-xs text-accent-foreground/60">
            {isError ? "Couldn't load client attention" : `${uniqueClientCount} clients waiting on you`}
          </p>
        </div>
        {!isError ? (
          <span className="rounded-full bg-accent-foreground/10 px-2.5 py-1 text-xs font-bold text-accent-foreground">
            {uniqueClientCount} {uniqueClientCount === 1 ? 'client' : 'clients'}
          </span>
        ) : null}
      </div>

      {isError ? (
        <div className="flex flex-1 items-center rounded-2xl border border-accent-foreground/10 p-4 text-sm text-accent-foreground/70">
          Couldn't load client attention.
        </div>
      ) : visibleClients.length === 0 ? (
        <div className="flex flex-1 items-center rounded-2xl border border-accent-foreground/10 p-4 text-sm text-accent-foreground/70">
          No client issues right now.
        </div>
      ) : (
        <div className="flex flex-col">
          {visibleClients.map(({client, reason}) => (
            <AttentionClientRow
              client={client}
              key={client.id}
              reason={reason}
            />
          ))}
        </div>
      )}
    </section>
  );
}
