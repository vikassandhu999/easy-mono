import {Avatar} from '@heroui/react';
import {ArrowRight, MessageCircle, TrendingDown, TrendingUp} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import type {Conversation} from '@/api/generated';
import {clientInitials, clientName} from '@/dashboard/lib/client-format';
import {compareDateStrings, formatDaysUntil, formatRelativeTime, formatShortDate} from '@/dashboard/lib/date-format';

type MobileDashboardProps = {
  activeClients: null | number;
  attentionClients: Client[];
  clientsError: boolean;
  conversations: Conversation[];
  conversationsError: boolean;
  lostProspects?: number;
  newProspects: null | number;
  prospectsError: boolean;
  subscriptionsEnding: Client[];
  wonProspects?: number;
};

type AttentionReason = {
  key: 'expiring_soon' | 'intake_incomplete' | 'needs_plan';
  label: string;
};

const ATTENTION_REASONS: AttentionReason[] = [
  {key: 'intake_incomplete', label: 'Intake incomplete'},
  {key: 'needs_plan', label: 'Needs plan'},
  {key: 'expiring_soon', label: 'Expiring soon'},
];

function MobileSectionHeading({children}: {children: string}) {
  return <h2 className="mb-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-muted">{children}</h2>;
}

function MobileStatCard({label, onPress, value}: {label: string; onPress: () => void; value: null | number}) {
  return (
    <button
      className="min-h-20 rounded-2xl border-[1.5px] border-separator bg-surface p-[0.9375rem] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      onClick={onPress}
      type="button"
    >
      <span className="block font-grotesk text-[2rem] font-bold leading-none tabular-nums">{value ?? '—'}</span>
      <span className="mt-1.5 block text-[0.71875rem] font-semibold text-muted">{label}</span>
    </button>
  );
}

function MobileWonLostCard({isError, lost = 0, won = 0}: {isError: boolean; lost?: number; won?: number}) {
  const navigate = useNavigate();
  const value = (count: number) => (isError ? '—' : count);

  return (
    <button
      className="mt-2.5 flex min-h-20 w-full items-stretch gap-3.5 rounded-2xl border-[1.5px] border-separator bg-surface p-[0.9375rem] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      onClick={() => navigate(ROUTES.PROSPECTS)}
      type="button"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-grotesk text-[1.75rem] font-bold leading-none tabular-nums text-success">
          {value(won)}
        </span>
        <span className="mt-1.5 flex items-center gap-1 text-[0.71875rem] font-semibold text-muted">
          <TrendingUp
            className="text-success"
            size={12}
          />
          Won
        </span>
      </span>
      <span className="w-px bg-separator" />
      <span className="min-w-0 flex-1">
        <span className="block font-grotesk text-[1.75rem] font-bold leading-none tabular-nums text-danger">
          {value(lost)}
        </span>
        <span className="mt-1.5 flex items-center gap-1 text-[0.71875rem] font-semibold text-muted">
          <TrendingDown
            className="text-danger"
            size={12}
          />
          Lost
        </span>
      </span>
    </button>
  );
}

function MobileConversationRow({conversation, featured}: {conversation: Conversation; featured: boolean}) {
  const navigate = useNavigate();
  const name = conversation.client_name || 'Client';

  return (
    <button
      className={
        featured
          ? 'flex min-h-14 w-full items-center gap-3 rounded-[0.8125rem] border-[1.5px] border-link/30 bg-link/5 px-3 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-focus'
          : 'flex min-h-14 w-full items-center gap-3 border-b border-surface-secondary py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-focus'
      }
      onClick={() => navigate(ROUTES.CONVERSATION.replace(':id', conversation.id))}
      type="button"
    >
      <span
        className={`grid size-8.5 shrink-0 place-items-center rounded-[0.5625rem] ${
          featured ? 'bg-link text-white' : 'bg-surface-secondary text-muted'
        }`}
      >
        <MessageCircle size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.8125rem] font-bold">{name}</span>
        <span className={`mt-0.5 block truncate text-[0.6875rem] ${featured ? 'text-link' : 'text-muted'}`}>
          {conversation.last_message_preview ?? 'No messages yet'} ·{' '}
          {formatRelativeTime(conversation.last_message_at ?? conversation.inserted_at)}
        </span>
      </span>
      <ArrowRight
        className={featured ? 'text-link' : 'text-muted'}
        size={14}
      />
    </button>
  );
}

function MobileConversations({conversations, isError}: {conversations: Conversation[]; isError: boolean}) {
  const visible = [...conversations]
    .sort((a, b) => compareDateStrings(b.last_message_at ?? b.inserted_at, a.last_message_at ?? a.inserted_at))
    .slice(0, 2);

  return (
    <section className="mt-4">
      <MobileSectionHeading>Recent conversations</MobileSectionHeading>
      {isError ? (
        <p className="rounded-[0.8125rem] border border-danger/20 bg-danger-soft p-3 text-xs text-danger-soft-foreground">
          Couldn't load conversations.
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-[0.8125rem] border border-separator p-3 text-xs text-muted">
          Conversations with your clients will show up here.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((conversation, index) => (
            <MobileConversationRow
              conversation={conversation}
              featured={index === 0}
              key={conversation.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function MobileSubscriptionRow({client}: {client: Client}) {
  const navigate = useNavigate();

  return (
    <button
      className="flex min-h-14 w-full items-center gap-3 rounded-[0.8125rem] border-[1.5px] border-separator px-3 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      onClick={() => navigate(ROUTES.CLIENT_DETAIL.replace(':id', client.id))}
      type="button"
    >
      <Avatar className="size-8.5 shrink-0 bg-accent text-accent-foreground">
        <Avatar.Fallback>{clientInitials(client)}</Avatar.Fallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.8125rem] font-semibold">{clientName(client)}</span>
        <span className="mt-0.5 block text-[0.6875rem] text-muted">
          Ends {formatShortDate(client.subscription_ends_on)}
        </span>
      </span>
      <span className="text-right">
        <span
          className={`block text-[0.6875rem] font-bold ${
            client.expiring_soon ? 'text-danger-soft-foreground' : 'text-warning-soft-foreground'
          }`}
        >
          {formatDaysUntil(client.subscription_ends_on)}
        </span>
        <span className="mt-0.5 block text-[0.6875rem] font-bold text-link">Open</span>
      </span>
    </button>
  );
}

function MobileSubscriptions({clients, isError}: {clients: Client[]; isError: boolean}) {
  return (
    <section className="mt-4">
      <MobileSectionHeading>Subscriptions ending</MobileSectionHeading>
      {isError ? (
        <p className="rounded-[0.8125rem] border border-danger/20 bg-danger-soft p-3 text-xs text-danger-soft-foreground">
          Couldn't load subscriptions.
        </p>
      ) : clients.length === 0 ? (
        <p className="rounded-[0.8125rem] border border-separator p-3 text-xs text-muted">
          No subscriptions end this month.
        </p>
      ) : (
        <div className="space-y-2">
          {clients.slice(0, 2).map((client) => (
            <MobileSubscriptionRow
              client={client}
              key={client.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function MobileAttentionRow({client, reason}: {client: Client; reason: string}) {
  const navigate = useNavigate();

  return (
    <button
      className="flex min-h-15 w-full items-center gap-3 border-b border-surface-secondary py-3 text-left last:border-b-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      onClick={() => navigate(ROUTES.CLIENT_DETAIL.replace(':id', client.id))}
      type="button"
    >
      <Avatar className="size-9.5 shrink-0 bg-accent text-accent-foreground">
        <Avatar.Fallback>{clientInitials(client)}</Avatar.Fallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.84375rem] font-semibold">{clientName(client)}</span>
        <span className="block truncate text-[0.71875rem] text-muted">{reason}</span>
      </span>
      <ArrowRight
        className="text-muted"
        size={14}
      />
    </button>
  );
}

function MobileAttention({clients, isError}: {clients: Client[]; isError: boolean}) {
  const preview = ATTENTION_REASONS.flatMap((reason) =>
    clients.filter((client) => client[reason.key]).map((client) => ({client, reason: reason.label})),
  )
    .filter(({client}, index, rows) => rows.findIndex((row) => row.client.id === client.id) === index)
    .slice(0, 2);

  return (
    <section className="mt-4">
      <MobileSectionHeading>Needs attention</MobileSectionHeading>
      {isError ? (
        <p className="rounded-[0.8125rem] border border-danger/20 bg-danger-soft p-3 text-xs text-danger-soft-foreground">
          Couldn't load client attention.
        </p>
      ) : preview.length === 0 ? (
        <p className="rounded-[0.8125rem] border border-separator p-3 text-xs text-muted">
          No client issues right now.
        </p>
      ) : (
        <div>
          {preview.map(({client, reason}) => (
            <MobileAttentionRow
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

export function MobileDashboard({
  activeClients,
  attentionClients,
  clientsError,
  conversations,
  conversationsError,
  lostProspects,
  newProspects,
  prospectsError,
  subscriptionsEnding,
  wonProspects,
}: MobileDashboardProps) {
  const navigate = useNavigate();

  return (
    <div className="sm:hidden">
      <div className="grid grid-cols-2 gap-2.5">
        <MobileStatCard
          label="Active clients"
          onPress={() => navigate(ROUTES.CLIENTS)}
          value={activeClients}
        />
        <MobileStatCard
          label="New prospects"
          onPress={() => navigate(ROUTES.PROSPECTS)}
          value={newProspects}
        />
      </div>
      <MobileWonLostCard
        isError={prospectsError}
        lost={lostProspects}
        won={wonProspects}
      />
      <MobileConversations
        conversations={conversations}
        isError={conversationsError}
      />
      <MobileSubscriptions
        clients={subscriptionsEnding}
        isError={clientsError}
      />
      <MobileAttention
        clients={attentionClients}
        isError={clientsError}
      />
    </div>
  );
}
