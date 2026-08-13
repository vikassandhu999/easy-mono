import {Avatar, Chip, Description, Label, ListBox, SearchField} from '@heroui/react';
import {cn} from '@heroui/styles';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox, {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
import {ROUTES} from '@/@config/routes';
import {type Conversation, useCoachConversationsInfiniteQuery} from '@/api/conversations';

/**
 * The coach inbox list shown in the Messages modal. Rows keep inbox mechanics:
 * recent first, unread emphasis — an awareness surface, not a drainable queue
 * (spec §2); the actionable slice lives in the Replies queue.
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

function ConversationListItem({active, conversation}: {active: boolean; conversation: Conversation}) {
  const name = conversation.client_name || 'Client';
  const initial = name[0]?.toUpperCase() ?? '';
  const unread = conversation.unread_count > 0;
  const emphasized = active || unread;

  return (
    <ListBox.Item
      // Shared row gutters, hairlines, and no press-scale.
      aria-current={active ? 'page' : undefined}
      className={cn(LIST_ITEM_CLASS, emphasized && 'bg-accent-soft hover:bg-accent-soft')}
      id={conversation.client_id}
      textValue={name}
    >
      <Avatar size="md">
        <Avatar.Fallback className={emphasized ? 'bg-accent-soft text-accent' : undefined}>{initial}</Avatar.Fallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Label className="max-w-full truncate type-body font-semibold leading-[normal] text-foreground">{name}</Label>
        <Description
          className={`max-w-full truncate type-eyebrow leading-[normal] ${unread ? 'font-medium text-foreground' : 'text-muted'}`}
        >
          {conversation.last_message_preview ?? 'No messages yet'}
        </Description>
      </div>
      <div className="ms-auto flex shrink-0 items-center self-start gap-2">
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

export function ConversationInboxList({
  activeClientId,
  className = 'flex-1 gap-0 p-0',
  onNavigate,
  searchable = false,
}: {
  activeClientId?: string;
  className?: string;
  /** Called after a row navigates — a modal host closes itself here. */
  onNavigate?: () => void;
  searchable?: boolean;
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const {data, fetchNextPage, isError, isLoading, refetch} = useCoachConversationsInfiniteQuery(deferredSearch);

  return (
    <>
      {searchable ? (
        <div className="sticky top-0 z-10 bg-surface pb-2 pt-2">
          <SearchField
            aria-label="Search conversations by client"
            className="w-full"
            onChange={setSearch}
            value={search}
            variant="secondary"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search clients…" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
      ) : null}
      <BrowseListBox
        ariaLabel="Conversations"
        className={className}
        emptyState={
          <ListEmptyState
            emptyDescription="Conversations with your clients will show up here."
            hasFilter={search.trim().length > 0}
            nounPlural="messages"
            onClearFilters={() => setSearch('')}
          />
        }
        fetchNextPage={fetchNextPage}
        isError={isError}
        isLoading={isLoading}
        items={data?.pages.flatMap((page) => page.data) ?? []}
        onAction={(key) => {
          navigate(ROUTES.CLIENT_MESSAGES.replace(':id', String(key)));
          onNavigate?.();
        }}
        onRetry={refetch}
        renderItem={(conversation) => (
          <ConversationListItem
            active={conversation.client_id === activeClientId}
            conversation={conversation}
            key={conversation.id}
          />
        )}
        skeletonAvatar
      />
    </>
  );
}
