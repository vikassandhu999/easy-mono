import {getInitials} from '@easy/utils';
import {MessageCircle} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox from '@/@components/browse-list-box';
import {EmptyState} from '@/@components/empty-state';
import {ROUTES} from '@/@config/routes';
import {type Conversation, useListCoachConversationsQuery} from '@/api/conversations';

import {QueueRow} from './queue-row';

/**
 * The actionable slice of messaging, not the inbox: only conversations where
 * the client spoke last (spec §3 "Replies"). The clock runs while the ball is
 * in the coach's court, so the row leads with how long they've been waiting,
 * and a coach who replied has zero items here whatever the unread state.
 */

const HOUR_MS = 60 * 60 * 1000;

function waitingFor(lastMessageAt: null | string | undefined): string {
  if (!lastMessageAt) {
    return 'Waiting';
  }
  const hours = Math.max(Math.floor((Date.now() - new Date(lastMessageAt).getTime()) / HOUR_MS), 0);
  if (hours < 1) {
    return 'Waiting under an hour';
  }
  if (hours < 48) {
    return `Waiting ${hours}h`;
  }
  return `Waiting ${Math.floor(hours / 24)}d`;
}

export default function RepliesView() {
  const navigate = useNavigate();
  const {data, isError, isLoading, refetch} = useListCoachConversationsQuery();

  // Longest-waiting first — the opposite of the inbox's recent-first order,
  // because this is a queue to drain, not a feed to browse.
  const items = (data?.data ?? [])
    .filter((conversation) => conversation.last_message_role === 'client')
    .sort((a, b) => (a.last_message_at ?? '').localeCompare(b.last_message_at ?? ''));

  const openConversation = (id: string) => navigate(ROUTES.CONVERSATION.replace(':id', id));

  const toRow = (conversation: Conversation) => {
    const name = conversation.client_name || 'Client';
    const [first, last] = name.split(/\s+/);
    return {
      action: 'Reply',
      id: conversation.id,
      initials: getInitials(first, last) || '?',
      name,
      onAction: () => openConversation(conversation.id),
      onOpen: () => openConversation(conversation.id),
      subtitle: [waitingFor(conversation.last_message_at), conversation.last_message_preview]
        .filter(Boolean)
        .join(' · '),
      tone: 'accent' as const,
    };
  };

  return (
    <BrowseListBox
      ariaLabel="Conversations waiting on you"
      className="flex-1 gap-0 p-0"
      emptyState={
        <EmptyState
          body="When a client messages you and you haven't replied yet, they show up here."
          icon={MessageCircle}
          title="Inbox clear — every client has heard back from you."
        />
      }
      grid
      fetchNextPage={() => undefined}
      isError={isError}
      isLoading={isLoading}
      items={items}
      onRetry={refetch}
      renderItem={(conversation) => (
        <QueueRow
          item={toRow(conversation)}
          key={conversation.id}
        />
      )}
      skeletonAvatar
    />
  );
}
