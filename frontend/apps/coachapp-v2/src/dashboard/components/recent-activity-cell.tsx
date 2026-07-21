import type {Key} from '@heroui/react';

import {Avatar, Badge, Button, Description, Label, ListBox, Typography} from '@heroui/react';
import {cn} from '@heroui/styles';
import {useNavigate} from 'react-router-dom';

import {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import {ROUTES} from '@/@config/routes';
import type {Conversation} from '@/api/generated';
import {DashboardSectionHeading} from '@/dashboard/components/dashboard-section-heading';
import {compareDateStrings, formatRelativeTime} from '@/dashboard/lib/date-format';

/** GAPS #15 — conversation rows are `ListBox` items, never a table. */
function ConversationRow({conversation}: {conversation: Conversation}) {
  const name = conversation.client_name || 'Client';
  const unread = conversation.unread_count > 0;

  return (
    <ListBox.Item
      className={cn(
        LIST_ITEM_CLASS,
        'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-none border-b border-separator py-3',
        'last:border-0 sm:px-4',
        // The unread row is the accent-tinted one in the reference.
        unread ? 'bg-accent-soft' : 'hover:bg-surface-secondary',
      )}
      id={conversation.id}
      textValue={name}
    >
      <Avatar
        className="size-9 shrink-0 bg-surface-secondary"
        size="md"
      >
        <Avatar.Fallback className="text-xs font-semibold text-foreground">
          {name[0]?.toUpperCase() ?? '?'}
        </Avatar.Fallback>
      </Avatar>

      <div className="flex min-w-0 flex-col">
        <span className="flex min-w-0 items-center gap-2">
          <Label className="min-w-0 truncate text-sm font-semibold text-foreground">{name}</Label>
          {unread ? (
            <Badge
              className="shrink-0"
              color="accent"
              size="sm"
            >
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </Badge>
          ) : null}
        </span>
        <Description className="max-w-full truncate text-xs text-muted">
          {conversation.last_message_preview ?? 'No messages yet'}
        </Description>
      </div>

      <Typography
        className="shrink-0 whitespace-nowrap text-muted-2"
        type="body-xs"
      >
        {formatRelativeTime(conversation.last_message_at ?? conversation.inserted_at)}
      </Typography>
    </ListBox.Item>
  );
}

export function RecentActivityCell({conversations, isError}: {conversations: Conversation[]; isError: boolean}) {
  const navigate = useNavigate();
  const visible = [...conversations]
    .sort((a, b) => compareDateStrings(b.last_message_at ?? b.inserted_at, a.last_message_at ?? a.inserted_at))
    .slice(0, 4);

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <DashboardSectionHeading
        aside={
          <Button
            className="min-h-11 shrink-0 text-muted"
            onPress={() => navigate(ROUTES.MESSAGES)}
            size="sm"
            variant="ghost"
          >
            Inbox
          </Button>
        }
        title="Recent conversations"
      />

      {isError ? (
        <div className="rounded-card border border-border bg-surface px-4 py-6 text-center">
          <Typography
            color="muted"
            type="body-sm"
          >
            Couldn't load conversations.
          </Typography>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-card border border-border bg-surface px-4 py-6 text-center">
          <Typography
            color="muted"
            type="body-sm"
          >
            Conversations with your clients will show up here.
          </Typography>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <ListBox
            aria-label="Recent conversations"
            className="gap-0 p-0"
            onAction={(key: Key) => navigate(ROUTES.CONVERSATION.replace(':id', String(key)))}
            selectionMode="none"
          >
            {visible.map((conversation) => (
              <ConversationRow
                conversation={conversation}
                key={conversation.id}
              />
            ))}
          </ListBox>
        </div>
      )}
    </section>
  );
}
