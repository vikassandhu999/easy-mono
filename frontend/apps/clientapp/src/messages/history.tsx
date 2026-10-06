import {focusManager} from '@tanstack/react-query';
import {ChevronRight, ClipboardCheck, MessageCircle, RefreshCw} from 'lucide-react';
import {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {generatePath, Link} from 'react-router-dom';
import {useAttachmentUrls} from '../api/attachments';
import {type ChatMessage, useConversationHistory, useReadConversation} from '../api/conversation';
import {latestPageCount} from '../api/pagination';
import {routes} from '../routes';
import {Bubble, BubbleContent} from '../ui/bubble';
import {Button} from '../ui/button';
import {CachedRead} from '../ui/cached-read';
import {useCoaching} from '../ui/coaching';
import {useOnline} from '../ui/connection-status';
import {useInfiniteScroll} from '../ui/infinite-scroll';
import {Message, MessageContent, MessageFooter, MessageHeader} from '../ui/message';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerViewport,
} from '../ui/message-scroller';
import {ReadState} from '../ui/read-state';

const subscribeFocus = (notify: () => void) => focusManager.subscribe(notify);
const focused = () => focusManager.isFocused();

export function History() {
  const {canWrite} = useCoaching();
  const query = useConversationHistory();
  const read = useReadConversation();
  const viewport = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const older = useInfiniteScroll({...query, root: viewport});
  const online = useOnline();
  const foreground = useSyncExternalStore(subscribeFocus, focused);
  const [atEnd, setAtEnd] = useState(false);
  const acknowledged = useRef<string | null>(null);
  const through = query.data?.pages[0]?.latest_message_at;
  const count = query.data ? latestPageCount(query.data.pages) : null;
  const {mutateAsync: markRead} = read;
  const items = [
    ...new Map(
      (query.data?.pages.toReversed().flatMap((page) => page.data.toReversed()) ?? []).map((message) => [
        message.id,
        message,
      ]),
    ).values(),
  ];

  useEffect(() => {
    if (!end.current || !viewport.current) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setAtEnd(Boolean(entry?.isIntersecting)), {
      root: viewport.current,
      threshold: 1,
    });
    observer.observe(end.current);
    return () => observer.disconnect();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: A fresh history read retries a failed acknowledgement of the same watermark.
  useEffect(() => {
    if (
      !canWrite ||
      !atEnd ||
      !foreground ||
      !online ||
      !through ||
      query.isFetching ||
      query.isError ||
      acknowledged.current === through
    ) {
      return;
    }
    acknowledged.current = through;
    markRead(through).catch(() => {
      acknowledged.current = null;
    });
  }, [canWrite, atEnd, foreground, online, through, query.isFetching, query.isError, query.dataUpdatedAt, markRead]);

  return (
    <div className="min-h-0 flex flex-1 flex-col">
      <div className="absolute top-3 right-4">
        <p className="sr-only">
          {count === null ? 'Conversation history' : `${count} ${count === 1 ? 'message' : 'messages'}`}
        </p>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Refresh messages"
          className="size-11 rounded-full p-0"
          isPending={query.isFetching}
          onPress={() => {
            query.refetch();
          }}
        >
          <RefreshCw
            aria-hidden="true"
            className="size-4"
          />
        </Button>
      </div>
      {query.data && (
        <div className="px-5">
          <CachedRead
            updatedAt={query.dataUpdatedAt}
            failed={query.isError && !query.isFetchNextPageError}
            refreshing={query.isFetching}
            refresh={() => query.refetch()}
          />
        </div>
      )}
      <MessageScroller>
        <MessageScrollerViewport
          ref={viewport}
          aria-label="Conversation history"
          tabIndex={0}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {query.hasNextPage && (
            <div
              ref={older}
              className="flex justify-center py-3"
            >
              <Button
                variant="outline"
                isPending={query.isFetchingNextPage}
                isDisabled={query.isFetching && !query.isFetchingNextPage}
                onPress={() => {
                  query.fetchNextPage({cancelRefetch: false});
                }}
              >
                {query.isFetchNextPageError ? 'Retry older messages' : 'Load older messages'}
              </Button>
            </div>
          )}
          <MessageScrollerContent
            aria-label="Messages"
            aria-live="off"
            className="p-5 gap-5"
          >
            {!query.data && (
              <MessageScrollerItem messageId="loading">
                <ReadState
                  label="messages"
                  failed={query.isError}
                  retry={() => {
                    query.refetch();
                  }}
                />
              </MessageScrollerItem>
            )}
            {query.data && items.length === 0 && (
              <MessageScrollerItem messageId="empty">
                <div className="mb-4 grid size-16 place-items-center rounded-3xl bg-[var(--coach)]">
                  <MessageCircle
                    aria-hidden="true"
                    className="size-7"
                  />
                </div>
                <h2 className="text-xl font-semibold">
                  {canWrite ? 'Your coach is a message away' : 'No messages yet'}
                </h2>
                {canWrite && (
                  <p className="mt-2 text-muted-foreground">Ask a question about your plan or share how today went.</p>
                )}
              </MessageScrollerItem>
            )}
            {items.map((message) => (
              <MessageScrollerItem
                key={message.id}
                messageId={message.id}
                data-message-id={message.id}
              >
                <Message align={message.sender_type === 'client' ? 'end' : 'start'}>
                  <MessageContent>
                    <MessageHeader className="sr-only">
                      {message.sender_type === 'client' ? 'You' : message.sender_name || 'Coach'}
                    </MessageHeader>
                    {message.body && (
                      <Bubble variant={message.sender_type === 'client' ? 'default' : 'muted'}>
                        <BubbleContent
                          className={`whitespace-pre-wrap rounded-[1.4rem] px-4 py-3 text-base ${message.sender_type === 'coach' ? 'rounded-bl-md bg-white' : 'rounded-br-md'}`}
                        >
                          {message.body}
                        </BubbleContent>
                      </Bubble>
                    )}
                    {message.embed && (
                      <Link
                        className="flex min-h-16 max-w-full items-center gap-3 rounded-2xl bg-[var(--training)] px-4 py-3 font-semibold text-primary"
                        to={referencePath(message.embed)}
                      >
                        <ClipboardCheck
                          aria-hidden="true"
                          className="size-5 shrink-0"
                        />
                        <span>
                          {message.embed.type === 'review' ? 'View Review: ' : 'View record: '}
                          {message.embed.snapshot.title}
                          {message.embed.snapshot.revision ? ` · revision ${message.embed.snapshot.revision}` : ''}
                        </span>
                        <ChevronRight
                          aria-hidden="true"
                          className="size-5 shrink-0"
                        />
                      </Link>
                    )}
                    {message.attachments.map((attachment) => (
                      <MessageMedia
                        key={attachment.id}
                        attachment={attachment}
                      />
                    ))}
                    <MessageFooter>
                      {message.sender_type === 'coach' && `${message.sender_name || 'Coach'} · `}
                      <time dateTime={message.inserted_at}>
                        {new Date(message.inserted_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </time>
                      {message.sender_type === 'client' && ' · Sent'}
                      {message.edited_at && ' · edited'}
                    </MessageFooter>
                  </MessageContent>
                </Message>
              </MessageScrollerItem>
            ))}
            <div
              ref={end}
              className="h-px shrink-0"
              aria-hidden="true"
            />
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton
          size="sm"
          aria-label="Jump to latest"
        >
          Jump to latest
        </MessageScrollerButton>
      </MessageScroller>
      {query.isFetchNextPageError && (
        <p
          role="alert"
          className="px-5 py-2 text-sm"
        >
          Older messages could not load. Your loaded conversation is still here.
        </p>
      )}
      {canWrite && read.isError && (
        <div className="px-5 text-sm flex items-center justify-between">
          <p>Read status could not update.</p>
          <Button
            variant="ghost"
            size="sm"
            isDisabled={!online || !atEnd || !through}
            onPress={() => {
              if (through) {
                markRead(through).catch(() => undefined);
              }
            }}
          >
            Retry read status
          </Button>
        </div>
      )}
    </div>
  );
}

function referencePath(embed: NonNullable<ChatMessage['embed']>) {
  const snapshot = embed.snapshot;
  const params = new URLSearchParams({returnTo: routes.messages, referenceId: embed.id});
  if (snapshot.revision) {
    params.set('referenceRevision', String(snapshot.revision));
  }
  let path: string;
  switch (embed.type) {
    case 'review':
      return `${routes.checkIns}?${new URLSearchParams({review: embed.id})}`;
    case 'training_session':
      path = generatePath(routes.trainingSession, {id: embed.id});
      break;
    case 'meal':
      path =
        snapshot.occurred_on && snapshot.meal_slot
          ? generatePath(routes.nutritionMeal, {date: snapshot.occurred_on, slot: snapshot.meal_slot})
          : routes.nutrition;
      break;
  }
  return `${path}?${params}`;
}

function MessageMedia({attachment}: {attachment: ChatMessage['attachments'][number]}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const query = useAttachmentUrls([attachment.id], open);
  const url = query.data?.data[0]?.download_url;
  const online = useOnline();
  const kind = attachment.content_type.startsWith('image/')
    ? 'Photo'
    : attachment.content_type.startsWith('video/')
      ? 'Video'
      : 'Audio';
  return (
    <div
      data-slot="message-media"
      className="max-w-full space-y-2"
    >
      <Button
        variant="outline"
        size="sm"
        onPress={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? 'Close' : 'Open'} {kind.toLowerCase()}
      </Button>
      {open && (
        <>
          {query.isPending && (
            <p
              role="status"
              className="text-sm"
            >
              {online ? 'Loading attachment…' : 'Reconnect to view this attachment.'}
            </p>
          )}
          {(query.isError || failed) && (
            <div className="text-sm space-y-2">
              <p role="alert">This attachment could not load.</p>
              <Button
                variant="outline"
                size="sm"
                isDisabled={!online}
                onPress={() => {
                  setFailed(false);
                  query.refetch();
                }}
              >
                Retry attachment
              </Button>
            </div>
          )}
          {url &&
            !failed &&
            (kind === 'Photo' ? (
              // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Image load errors expose a retry.
              <img
                key={query.dataUpdatedAt}
                src={url}
                alt="Shared in this conversation"
                className="max-h-72 max-w-full rounded-xl object-contain"
                onError={() => setFailed(true)}
              />
            ) : kind === 'Video' ? (
              <video
                key={query.dataUpdatedAt}
                src={url}
                controls
                playsInline
                preload="metadata"
                className="max-h-72 max-w-full rounded-xl"
                onError={() => setFailed(true)}
              >
                <track kind="captions" />
              </video>
            ) : (
              <audio
                key={query.dataUpdatedAt}
                src={url}
                controls
                preload="metadata"
                className="max-w-full"
                onError={() => setFailed(true)}
              >
                <track kind="captions" />
              </audio>
            ))}
          {url && (
            <a
              className="text-link block text-sm"
              href={url}
              target="_blank"
              rel="noreferrer"
            >
              Open original {kind.toLowerCase()}
            </a>
          )}
        </>
      )}
    </div>
  );
}
