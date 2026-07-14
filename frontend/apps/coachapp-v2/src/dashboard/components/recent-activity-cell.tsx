import {Avatar, Typography} from '@heroui/react';
import {ArrowRight} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import type {Conversation} from '@/api/generated';
import {compareDateStrings, formatRelativeTime} from '@/dashboard/lib/date-format';

function ConversationRow({conversation}: {conversation: Conversation}) {
  const navigate = useNavigate();
  const name = conversation.client_name || 'Client';
  const unread = conversation.unread_count > 0;

  return (
    <button
      className={`flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
        unread ? 'bg-accent-soft' : 'hover:bg-surface-hover'
      }`}
      onClick={() => navigate(ROUTES.CONVERSATION.replace(':id', conversation.id))}
      type="button"
    >
      <Avatar size="sm">
        <Avatar.Fallback>{name[0]?.toUpperCase() ?? '?'}</Avatar.Fallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
          {unread ? (
            <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-accent-foreground">
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </span>
          ) : null}
        </span>
        <span className="block truncate text-xs text-muted">
          {conversation.last_message_preview ?? 'No messages yet'}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
        {formatRelativeTime(conversation.last_message_at ?? conversation.inserted_at)}
        <ArrowRight size={14} />
      </span>
    </button>
  );
}

export function RecentActivityCell({conversations, isError}: {conversations: Conversation[]; isError: boolean}) {
  const visible = [...conversations]
    .sort((a, b) => compareDateStrings(b.last_message_at ?? b.inserted_at, a.last_message_at ?? a.inserted_at))
    .slice(0, 4);

  return (
    <section className="flex flex-col gap-3">
      <Typography type="h5">Recent conversations</Typography>
      {isError ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-6 text-center text-sm text-danger-soft-foreground">
          Couldn't load conversations.
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
          Conversations with your clients will show up here.
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {visible.map((conversation) => (
            <ConversationRow
              conversation={conversation}
              key={conversation.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
