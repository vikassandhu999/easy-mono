import {Avatar, Chip, Description, Label, ListBox} from '@heroui/react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {type Conversation, useListCoachConversationsQuery} from '@/api/conversations';

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
      className="min-h-fit px-4 py-3 sm:px-8"
      id={conversation.id}
      textValue={name}
    >
      <Avatar size="sm">
        <Avatar.Fallback>{initial}</Avatar.Fallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <Label className="truncate">{name}</Label>
        <Description className={`truncate ${unread ? 'font-medium text-foreground' : ''}`}>
          {conversation.last_message_preview ?? 'No messages yet'}
        </Description>
      </div>
      <div className="ms-auto flex shrink-0 flex-col items-end gap-1">
        <span className="text-xs text-muted">{timeAgo(conversation.last_message_at)}</span>
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

export default function MessagesInbox() {
  const navigate = useNavigate();
  // ponytail: flat first-100 inbox, add offset paging when a business outgrows it.
  const {data, isError, isLoading, refetch} = useListCoachConversationsQuery({limit: 100});
  const conversations = data?.data ?? [];

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup>
          <Page.Title>Messages</Page.Title>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content>
        <BrowseListBox
          ariaLabel="Conversations"
          className="flex-1 gap-0"
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
          items={conversations}
          onAction={(key) => navigate(ROUTES.CONVERSATION.replace(':id', String(key)))}
          onRetry={refetch}
          renderItem={(conversation) => <ConversationListItem conversation={conversation} />}
          skeletonAvatar
        />
      </Page.Content>
    </Page>
  );
}
