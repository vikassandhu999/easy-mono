import {ArrowLeft} from 'lucide-react';
import {useState} from 'react';
import {generatePath, Link, useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {useConversationUpdates} from '../api/conversation-updates';
import {
  type Conversation as ConversationData,
  useConversation,
  useConversationAction,
  useMessages,
} from '../api/conversations';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {FormError} from '../ui/form-error';
import {useListLocation} from '../ui/list-location';
import {MessageScrollerProvider} from '../ui/message-scroller';
import {StatusBadge, Surface} from '../ui/page';
import {MessageComposer} from './message-composer';
import {MessageHistory} from './message-history';

export function Conversation() {
  const {clientId = ''} = useParams();
  const query = useConversation(clientId);
  const back = useListLocation(routes.conversations);
  return (
    <div className="mx-auto flex h-[calc(100dvh-10.625rem)] min-h-[36rem] w-full max-w-3xl flex-col gap-3 md:h-[calc(100dvh-12.125rem)]">
      <header className="shrink-0 space-y-2">
        <Link
          to={back.to}
          state={back.state}
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft
            size={16}
            aria-hidden="true"
          />
          Back to messages
        </Link>
        <div className="flex items-center justify-between gap-4">
          <h1 className="min-w-0 break-words text-xl font-semibold">
            {query.data?.data.client_name || 'Client conversation'}
          </h1>
          <Link
            to={generatePath(routes.client, {id: clientId})}
            className={buttonVariants({variant: 'ghost', size: 'sm'})}
          >
            View client
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">Shared with your coaching team.</p>
      </header>
      {!query.data ? (
        <Surface>
          {query.isPending ? (
            <p role="status">Opening conversation…</p>
          ) : (
            <div className="space-y-3">
              <FormError message={errorMessage(query.error, 'Could not open this conversation.')} />
              <Button
                onPress={() => {
                  query.refetch();
                }}
              >
                Try again
              </Button>
            </div>
          )}
        </Surface>
      ) : (
        <Thread
          key={query.data.data.id}
          conversation={query.data.data}
        />
      )}
    </div>
  );
}

function Thread({conversation}: {conversation: ConversationData}) {
  const messages = useMessages(conversation.id);
  const action = useConversationAction(conversation.id);
  const connection = useConversationUpdates();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  async function update(kind: 'read' | 'handled') {
    const through = messages.data?.pages[0]?.latest_message_at;
    if (!through) {
      return;
    }
    setError('');
    setNotice('');
    try {
      await action.mutateAsync(kind === 'read' ? {kind, through} : {kind, expected: through});
      setNotice(kind === 'read' ? 'Marked as read for your team.' : 'Conversation marked handled.');
    } catch (error) {
      setError(
        error instanceof ApiError && error.status === 409
          ? 'A new message arrived. Read it before marking this conversation handled.'
          : errorMessage(error, 'Could not update this conversation. Try again.'),
      );
    }
  }
  return (
    <MessageScrollerProvider
      defaultScrollPosition="end"
      autoScroll
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {conversation.waiting_since && <StatusBadge>Needs reply</StatusBadge>}
        {conversation.unread_count > 0 && (
          <Button
            variant="outline"
            size="sm"
            isDisabled={!messages.data || messages.isFetching || messages.isError}
            isPending={action.isPending}
            onPress={() => {
              update('read');
            }}
          >
            Mark as read · {conversation.unread_count}
          </Button>
        )}
        {conversation.waiting_since && (
          <Button
            variant="ghost"
            size="sm"
            isDisabled={!messages.data || messages.isFetching || messages.isError}
            isPending={action.isPending}
            onPress={() => {
              update('handled');
            }}
          >
            Mark handled
          </Button>
        )}
      </div>
      {notice && (
        <p
          role="status"
          className="text-sm"
        >
          {notice}
        </p>
      )}
      {error && <FormError message={error} />}
      {connection === 'reconnecting' && (
        <p
          role="status"
          className="text-sm text-muted-foreground"
        >
          Live updates are reconnecting. Refresh messages to check for replies.
        </p>
      )}
      <MessageHistory
        query={messages}
        clientId={conversation.client_id}
        clientName={conversation.client_name || 'Client'}
      />
      <MessageComposer conversation={conversation} />
    </MessageScrollerProvider>
  );
}
