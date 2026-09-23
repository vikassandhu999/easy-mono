import {ArrowLeft, X} from 'lucide-react';
import {useCallback, useState} from 'react';
import {generatePath, Link, useParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
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
import {Surface} from '../ui/page';
import type {RecordReference} from './draft';
import {MessageComposer} from './message-composer';
import {MessageHistory} from './message-history';
import {RecordDetail} from './record-detail';

export function Conversation() {
  const {clientId = ''} = useParams();
  const query = useConversation(clientId);
  const back = useListLocation(routes.conversations);
  return (
    <div className="mx-auto flex h-[calc(100dvh-10.625rem)] min-h-[44rem] w-full max-w-7xl flex-col gap-4 md:h-[calc(100dvh-12.125rem)]">
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
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 break-words text-xl font-semibold">
            {query.data?.data.client_name || 'Conversation'}
          </h1>
          <Link
            to={generatePath(routes.client, {id: clientId})}
            className={buttonVariants({variant: 'ghost', size: 'sm'})}
          >
            Client details
          </Link>
        </div>
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
        <ConversationThread
          key={query.data.data.id}
          conversation={query.data.data}
        />
      )}
    </div>
  );
}
function ConversationThread({conversation}: {conversation: ConversationData}) {
  const [context, setContext] = useState<RecordReference | null>(null);
  const [reference, setReference] = useState<RecordReference | null>(null);
  const consumeReference = useCallback(() => setReference(null), []);
  function discuss(record: RecordReference) {
    setReference(record);
    setContext(null);
  }
  return (
    <>
      <div
        className={
          context
            ? 'grid min-h-0 flex-1 items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]'
            : 'mx-auto flex min-h-0 w-full max-w-3xl flex-1'
        }
      >
        <div className={context ? 'hidden min-h-0 flex-col gap-3 lg:flex' : 'flex min-h-0 flex-1 flex-col gap-3'}>
          <Thread
            conversation={conversation}
            requestedReference={reference}
            onReferenceConsumed={consumeReference}
            onOpen={setContext}
          />
        </div>
        {context && (
          <aside
            aria-label="Client context"
            className="min-h-0 min-w-0 space-y-5 overflow-y-auto rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="min-w-0 break-words font-semibold">{context.title}</h2>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Back to conversation"
                onPress={() => setContext(null)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            <RecordDetail
              clientId={conversation.client_id}
              record={context}
              onDiscuss={discuss}
            />
            <Button
              variant="outline"
              onPress={() => setContext(null)}
            >
              Back to conversation
            </Button>
          </aside>
        )}
      </div>
    </>
  );
}
function Thread({
  conversation,
  requestedReference,
  onReferenceConsumed,
  onOpen,
}: {
  conversation: ConversationData;
  requestedReference: RecordReference | null;
  onReferenceConsumed: () => void;
  onOpen: (record: RecordReference) => void;
}) {
  const messages = useMessages(conversation.id);
  const action = useConversationAction(conversation.id);
  const connection = useConversationUpdates();
  const [shownThrough, setShownThrough] = useState<string | null>(null);
  const onShownMessage = useCallback((_id: string, timestamp: string) => {
    setShownThrough((previous) => (!previous || timestamp > previous ? timestamp : previous));
  }, []);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  async function markRead() {
    const through = shownThrough;
    if (!through) {
      return;
    }
    setError('');
    setNotice('');
    try {
      await action.mutateAsync({kind: 'read', through});
      setNotice('Marked as read for your team.');
    } catch (error) {
      setError(errorMessage(error, 'Could not update these messages. Try again.'));
    }
  }
  return (
    <MessageScrollerProvider
      defaultScrollPosition="end"
      autoScroll
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {conversation.unread_count > 0 && (
          <Button
            variant="outline"
            size="sm"
            isDisabled={!shownThrough || !messages.data || messages.isFetching || messages.isError}
            isPending={action.isPending}
            onPress={() => {
              markRead();
            }}
          >
            Mark as read · {conversation.unread_count}
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
          className="text-xs text-muted-foreground"
        >
          Live updates are reconnecting. Refresh messages to check for replies.
        </p>
      )}
      <MessageHistory
        query={messages}
        clientId={conversation.client_id}
        clientName={conversation.client_name || 'Client'}
        onOpenRecord={onOpen}
        onShownMessage={onShownMessage}
      />
      <MessageComposer
        conversation={conversation}
        requestedReference={requestedReference}
        onReferenceConsumed={onReferenceConsumed}
      />
    </MessageScrollerProvider>
  );
}
