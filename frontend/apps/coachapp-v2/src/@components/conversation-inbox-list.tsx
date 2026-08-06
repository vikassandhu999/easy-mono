import {Avatar, Chip, Description, Label, ListBox} from '@heroui/react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
import {ROUTES} from '@/@config/routes';
import {type Conversation, useListCoachConversationsQuery} from '@/api/conversations';

/**
 * The coach inbox list, content only — shared by the `/messages` screen
 * (mobile's full-page inbox) and the workbench's Messages view (desktop
 * inline). Rows keep inbox mechanics: recent first, unread emphasis — an
 * awareness surface, not a drainable queue (spec §2); the actionable slice
 * lives in the Replies queue.
 */

function timeAgo(iso: string | null | undefined) {
  if (!iso) {
    return '';
  }
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) {
    return 'now';
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  if (minutes < 24 * 60) {
    return `${Math.round(minutes / 60)}h`;
  }
  return `${Math.round(minutes / (24 * 60))}d`;
}

function ConversationListItem({conversation}: {conversation: Conversation}) {
  const name = conversation.client_name || 'Client';
  const initial = name[0]?.toUpperCase() ?? '';
  const unread = conversation.unread_count > 0;

  return (
    <ListBox.Item
      className={`min-h-16 px-4 py-3 transition-colors active:scale-100! data-[pressed=true]:scale-100! sm:px-8 ${
        unread ? 'bg-accent-soft' : 'hover:bg-surface-hover'
      }`}
      id={conversation.id}
      textValue={name}
    >
      <Avatar
        className={unread ? 'bg-accent-soft text-accent' : undefined}
        size="sm"
      >
        <Avatar.Fallback>{initial}</Avatar.Fallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <Label className={`truncate ${unread ? 'font-semibold text-foreground' : ''}`}>{name}</Label>
        <Description className={`truncate ${unread ? 'font-medium text-foreground' : ''}`}>
          {conversation.last_message_preview ?? 'No messages yet'}
        </Description>
      </div>
      <div className="ms-auto flex shrink-0 flex-col items-end gap-1">
        <span className={`type-eyebrow ${unread ? 'font-medium text-accent-soft-foreground' : 'text-muted'}`}>
          {timeAgo(conversation.last_message_at)}
        </span>
        {unread ? (
          <Chip
            color="accent"
            size="sm"
          >
            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
          </Chip>
        ) : null}
      </div>
    </ListBox.Item>
  );
}

export function ConversationInboxList({className = 'flex-1 gap-0 p-0'}: {className?: string}) {
  const navigate = useNavigate();
  const {data, isError, isLoading, refetch} = useListCoachConversationsQuery();

  return (
    <BrowseListBox
      ariaLabel="Conversations"
      className={className}
      emptyState={
        <ListEmptyState
          emptyDescription="Conversations with your clients will show up here."
          hasFilter={false}
          nounPlural="messages"
        />
      }
      fetchNextPage={() => undefined}
      isError={isError}
      isLoading={isLoading}
      items={data?.data ?? []}
      onAction={(key) => navigate(ROUTES.CONVERSATION.replace(':id', String(key)))}
      onRetry={refetch}
      renderItem={(conversation) => (
        <ConversationListItem
          conversation={conversation}
          key={conversation.id}
        />
      )}
      skeletonAvatar
    />
  );
}
