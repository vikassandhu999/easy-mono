import {formatIsoDate} from '@easy/utils';
import {generatePath, Link, useSearchParams} from 'react-router-dom';
import {useConversationUpdates} from '../api/conversation-updates';
import {useConversations} from '../api/conversations';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';

export function Conversations() {
  const [params, setParams] = useSearchParams();
  const value = params.get('status');
  const status = value === 'waiting' || value === 'unread' ? value : 'all';
  const search = params.get('search') ?? '';
  const query = useConversations({search, status});
  const connection = useConversationUpdates();
  return (
    <Page>
      <PageHeader
        title="Messages"
        description="Catch up with clients and follow through on their questions."
        actions={
          <Link
            to={routes.home}
            className={buttonVariants({variant: 'outline'})}
          >
            Choose a client
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <ListSearch
          label="Search conversations"
          placeholder="Client name, email or phone"
        />
        <div className="grid gap-2">
          <span
            id="conversation-status-label"
            className="text-sm font-medium"
          >
            Show
          </span>
          <SelectField
            id="conversation-status"
            value={status}
            onChange={(value) =>
              setParams(
                (previous) => {
                  const next = new URLSearchParams(previous);
                  if (value === 'waiting' || value === 'unread') {
                    next.set('status', value);
                  } else {
                    next.delete('status');
                  }
                  return next;
                },
                {replace: true},
              )
            }
          >
            <SelectItem id="all">All conversations</SelectItem>
            <SelectItem id="waiting">Needs reply</SelectItem>
            <SelectItem id="unread">Unread</SelectItem>
          </SelectField>
        </div>
      </div>
      {connection === 'reconnecting' && (
        <p
          role="status"
          className="text-sm text-muted-foreground"
        >
          Live updates are reconnecting. You can still refresh your inbox.
        </p>
      )}
      <InfiniteList
        query={query}
        label="conversations"
        singular="conversation"
        empty={
          <Surface>
            <h2 className="section-title">
              {search
                ? 'No matching conversations'
                : status === 'waiting'
                  ? 'No clients waiting for a reply'
                  : status === 'unread'
                    ? 'No unread conversations'
                    : 'Your conversations start here'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {search
                ? 'Try another name, email or phone number.'
                : status === 'all'
                  ? 'Open a client and choose Message client to get in touch.'
                  : 'Choose All conversations to revisit an earlier conversation.'}
            </p>
          </Surface>
        }
      >
        {(conversation) => (
          <Link
            to={generatePath(routes.clientConversation, {clientId: conversation.client_id})}
            state={{listSearch: `?${params}`}}
            className="block space-y-2 p-5 transition-colors hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="break-words text-lg font-semibold">{conversation.client_name || 'Client'}</h2>
              {conversation.last_message_at && (
                <time
                  dateTime={conversation.last_message_at}
                  className="text-xs text-muted-foreground"
                >
                  {formatIsoDate(conversation.last_message_at)}
                </time>
              )}
            </div>
            <p className="line-clamp-2 break-words text-sm text-muted-foreground">
              {conversation.last_message_role === 'coach' ? 'Coach: ' : ''}
              {conversation.last_message_preview || 'No messages yet'}
            </p>
            <div className="flex flex-wrap gap-2">
              {conversation.unread_count > 0 && <StatusBadge>{conversation.unread_count} unread</StatusBadge>}
              {conversation.waiting_since && <StatusBadge>Needs reply</StatusBadge>}
            </div>
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}
