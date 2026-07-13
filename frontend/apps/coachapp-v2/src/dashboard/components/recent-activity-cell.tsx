import {Avatar} from '@heroui/react';
import {ArrowRight, MessageCircle} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import type {Conversation} from '@/api/generated';
import {compareDateStrings, formatRelativeTime} from '@/dashboard/lib/date-format';

function activityTime(conversation: Conversation): string {
  return formatRelativeTime(conversation.last_message_at ?? conversation.inserted_at);
}

function ConversationRow({conversation, featured = false}: {conversation: Conversation; featured?: boolean}) {
  const navigate = useNavigate();
  const name = conversation.client_name || 'Client';
  const unread = conversation.unread_count > 0;

  return (
    <button
      className={
        featured
          ? 'flex min-h-16 w-full items-center gap-3 rounded-card border border-link/30 bg-link-soft p-3 text-left transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus'
          : 'flex min-h-14 w-full items-center gap-3 border-t border-surface-secondary py-3 text-left transition-opacity hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus'
      }
      onClick={() => navigate(ROUTES.CONVERSATION.replace(':id', conversation.id))}
      type="button"
    >
      <Avatar
        className={featured ? 'shrink-0 bg-accent text-accent-foreground' : 'shrink-0 bg-surface-secondary text-muted'}
        size="sm"
      >
        <Avatar.Fallback>{name[0]?.toUpperCase() ?? '?'}</Avatar.Fallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold">{name}</span>
          {unread ? (
            <span className="shrink-0 rounded-full bg-danger px-1.5 py-0.5 text-2xs font-bold leading-none text-danger-foreground">
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </span>
          ) : null}
        </span>
        <span className={`block truncate text-xs ${featured ? 'text-link' : 'text-muted'}`}>
          {conversation.last_message_preview ?? 'No messages yet'}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-muted">
        {activityTime(conversation)}
        <ArrowRight size={14} />
      </span>
    </button>
  );
}

export function RecentActivityCell({conversations, isError}: {conversations: Conversation[]; isError: boolean}) {
  const sorted = [...conversations].sort((a, b) =>
    compareDateStrings(b.last_message_at ?? b.inserted_at, a.last_message_at ?? a.inserted_at),
  );
  const [featured, ...rest] = sorted.slice(0, 4);

  return (
    <section className="col-span-2 flex min-h-80 flex-col rounded-card border border-border bg-surface p-5 sm:col-span-2 sm:row-span-2">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-control bg-link-soft text-link">
          <MessageCircle size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="font-grotesk text-lg font-bold leading-tight">Recent activity</h2>
          <p className="mt-1 text-xs text-muted">Recent client conversations</p>
        </div>
      </div>

      {isError ? (
        <div className="flex flex-1 items-center rounded-card border border-danger/20 bg-danger-soft p-4 text-sm text-danger-soft-foreground">
          Couldn't load recent activity.
        </div>
      ) : !featured ? (
        <div className="flex flex-1 items-center rounded-card border border-border p-4 text-sm text-muted">
          Conversations with your clients will show up here.
        </div>
      ) : (
        <div className="flex flex-col">
          <ConversationRow
            conversation={featured}
            featured
          />
          <div className="mt-2 flex flex-col">
            {rest.map((conversation) => (
              <ConversationRow
                conversation={conversation}
                key={conversation.id}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
