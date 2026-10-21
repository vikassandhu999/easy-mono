import {ChevronRight, MessageCircle} from 'lucide-react';
import {generatePath, Link, useLocation, useSearchParams} from 'react-router-dom';
import {useConversationUpdates} from '../api/conversation-updates';
import {useConversations} from '../api/conversations';
import {routes} from '../routes';
import {InfiniteList} from '../ui/infinite-list';
import {Label} from '../ui/label';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';

export function Conversations() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const status = params.get('status') === 'unread' ? 'unread' : 'all';
  const query = useConversations({search: params.get('search')?.trim() ?? '', status});
  useConversationUpdates();
  return (
    <Page>
      <PageHeader
        title="Messages"
        description="Conversations with your clients."
      />
      <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <ListSearch label="Search conversations" />
        <div className="grid gap-2">
          <Label htmlFor="conversation-status">Messages</Label>
          <SelectField
            id="conversation-status"
            value={status}
            onChange={(value) =>
              setParams(
                (previous) => {
                  const next = new URLSearchParams(previous);
                  if (value === 'unread') {
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
            <SelectItem id="all">All messages</SelectItem>
            <SelectItem id="unread">Unread</SelectItem>
          </SelectField>
        </div>
      </div>
      <InfiniteList
        query={query}
        label="conversations"
        singular="conversation"
        empty={
          <Surface className="py-12 text-center">
            <MessageCircle
              className="mx-auto mb-4 text-muted-foreground"
              aria-hidden="true"
            />
            <h2 className="section-title">No conversations here</h2>
            <p className="mt-2 text-sm text-muted-foreground">Open a client's details to start a conversation.</p>
            <Link
              to={routes.home}
              className="text-link mt-4 inline-block"
            >
              View clients
            </Link>
          </Surface>
        }
      >
        {(conversation) => (
          <Link
            to={generatePath(routes.clientConversation, {clientId: conversation.client_id})}
            state={{listSearch: location.search}}
            className="client-row"
          >
            <div className="min-w-0 flex-1">
              <p className="break-words font-semibold">{conversation.client_name || 'Client'}</p>
              {conversation.last_message_preview && (
                <p className="mt-1 truncate text-sm text-muted-foreground">{conversation.last_message_preview}</p>
              )}
            </div>
            {conversation.unread_count > 0 && <StatusBadge>{conversation.unread_count} unread</StatusBadge>}
            <ChevronRight
              size={18}
              aria-hidden="true"
            />
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}
