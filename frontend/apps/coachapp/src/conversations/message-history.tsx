import {formatIsoDate} from '@easy/utils';
import {useEffect, useRef, useState} from 'react';
import {generatePath, Link} from 'react-router-dom';
import {useAttachmentDownloads} from '../api/attachments';
import {errorMessage} from '../api/client';
import {type ChatMessage, useMessages} from '../api/conversations';
import {routes} from '../routes';
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentTitle,
  AttachmentTrigger,
} from '../ui/attachment';
import {Bubble, BubbleContent} from '../ui/bubble';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {Message, MessageContent, MessageFooter, MessageHeader} from '../ui/message';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerViewport,
} from '../ui/message-scroller';
import type {RecordReference} from './draft';

export function MessageHistory({
  query,
  clientName,
  clientId,
  onOpenRecord,
  onShownMessage,
}: {
  query: ReturnType<typeof useMessages>;
  clientName: string;
  clientId: string;
  onOpenRecord: (record: RecordReference) => void;
  onShownMessage: (id: string, timestamp: string) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const older = useRef<HTMLDivElement>(null);
  const {hasNextPage, isFetching, isError, fetchNextPage} = query;
  useEffect(() => {
    if (
      !viewport.current ||
      !older.current ||
      !query.data ||
      !hasNextPage ||
      isFetching ||
      isError ||
      !('IntersectionObserver' in window)
    ) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          observer.disconnect();
          fetchNextPage({cancelRefetch: false});
        }
      },
      {root: viewport.current},
    );
    observer.observe(older.current);
    return () => observer.disconnect();
  }, [query.data, hasNextPage, isFetching, isError, fetchNextPage]);
  useEffect(() => {
    const root = viewport.current;
    if (!root || !query.data || !('IntersectionObserver' in window)) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const timestamp = entry.target.getAttribute('data-message-at');
          const id = entry.target.getAttribute('data-message-id');
          if (entry.isIntersecting && timestamp && id) {
            onShownMessage(id, timestamp);
          }
        }
      },
      {root, threshold: 0.1},
    );
    for (const item of root.querySelectorAll('[data-message-at]')) {
      observer.observe(item);
    }
    return () => observer.disconnect();
  }, [query.data, onShownMessage]);
  const items = query.data?.pages.toReversed().flatMap((page) => page.data.toReversed()) ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <p
          role="status"
          className="text-sm text-muted-foreground"
        >
          {query.data ? `${query.data.pages.at(-1)?.count ?? 0} messages` : 'Conversation history'}
        </p>
        <Button
          variant="ghost"
          isPending={isFetching}
          onPress={() => {
            query.refetch();
          }}
        >
          Refresh messages
        </Button>
      </div>
      <div className="min-h-32 flex-1 rounded-2xl border border-border bg-surface">
        <MessageScroller>
          <MessageScrollerViewport
            ref={viewport}
            aria-label="Conversation history"
            className="rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            {hasNextPage && (
              <div
                ref={older}
                className="flex justify-center pt-4"
              >
                <Button
                  variant="outline"
                  isPending={isFetching}
                  onPress={() => {
                    fetchNextPage({cancelRefetch: false});
                  }}
                >
                  {query.isFetchNextPageError ? 'Retry older messages' : 'Load older messages'}
                </Button>
              </div>
            )}
            <MessageScrollerContent
              aria-live="off"
              aria-label="Messages"
              className="p-4 sm:p-6"
            >
              {!query.data ? (
                <MessageScrollerItem messageId="loading">
                  {query.isPending ? (
                    <p role="status">{query.isPaused ? 'Waiting for a connection…' : 'Loading messages…'}</p>
                  ) : (
                    <div className="space-y-3">
                      <FormError message={errorMessage(query.error, 'Could not load messages.')} />
                      <Button
                        onPress={() => {
                          query.refetch();
                        }}
                      >
                        Try again
                      </Button>
                    </div>
                  )}
                </MessageScrollerItem>
              ) : (
                <>
                  {items.length === 0 && (
                    <MessageScrollerItem messageId="empty">
                      <h2 className="section-title">Start the conversation</h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Send a welcome, ask how things are going, or follow up on your client's plan.
                      </p>
                    </MessageScrollerItem>
                  )}
                  {items.map((message) => (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                      data-message-id={message.id}
                      data-message-at={message.inserted_at}
                    >
                      <Message align={message.sender_type === 'coach' ? 'end' : 'start'}>
                        <MessageContent>
                          <MessageHeader>
                            {message.sender_type === 'coach' ? message.sender_name || 'Coach' : clientName}
                          </MessageHeader>
                          {message.body && (
                            <Bubble variant={message.sender_type === 'coach' ? 'default' : 'muted'}>
                              <BubbleContent className="whitespace-pre-wrap">{message.body}</BubbleContent>
                            </Bubble>
                          )}
                          {message.embed?.type === 'review' ? (
                            <Link
                              className="text-link text-sm"
                              to={`${generatePath(routes.reviews, {clientId})}#${message.embed.id}`}
                            >
                              Open Review
                            </Link>
                          ) : (
                            message.embed && (
                              <Button
                                variant="outline"
                                className="h-auto max-w-full justify-start py-3 text-left whitespace-normal"
                                onPress={() => {
                                  if (message.embed && message.embed.type !== 'review') {
                                    onOpenRecord({
                                      type: message.embed.type,
                                      id: message.embed.id,
                                      title: message.embed.snapshot.title,
                                      revision: message.embed.snapshot.revision ?? 1,
                                      occurredOn: message.embed.snapshot.occurred_on ?? null,
                                    });
                                  }
                                }}
                              >
                                <span>
                                  <span className="block break-words">{message.embed.snapshot.title}</span>
                                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                                    Shared revision {message.embed.snapshot.revision ?? 1} · Open latest record
                                  </span>
                                </span>
                              </Button>
                            )
                          )}
                          {message.attachments.map((attachment) => (
                            <MessageAttachment
                              key={attachment.id}
                              attachment={attachment}
                            />
                          ))}
                          <MessageFooter>
                            <time dateTime={message.inserted_at}>{formatIsoDate(message.inserted_at)}</time>
                            {message.edited_at && <span> · edited</span>}
                          </MessageFooter>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  ))}
                </>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton
            size="sm"
            aria-label="Jump to latest"
          >
            Jump to latest
          </MessageScrollerButton>
        </MessageScroller>
      </div>
      {query.data && query.isError && (
        <FormError
          message={errorMessage(query.error, 'Messages could not update. Your loaded history is still here.')}
        />
      )}
      {query.isPaused && (
        <p
          role="status"
          className="text-sm text-muted-foreground"
        >
          Waiting for a connection. Your loaded messages are still here.
        </p>
      )}
    </div>
  );
}

function MessageAttachment({attachment}: {attachment: ChatMessage['attachments'][number]}) {
  const [open, setOpen] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const query = useAttachmentDownloads([attachment.id], open);
  const url = query.data?.data[0]?.download_url;
  const kind = attachment.content_type.startsWith('image/')
    ? 'Photo'
    : attachment.content_type.startsWith('video/')
      ? 'Video'
      : 'Audio';
  return (
    <div className="w-fit max-w-full space-y-2">
      <Attachment state={query.isError || mediaError ? 'error' : 'done'}>
        <AttachmentContent>
          <AttachmentTitle>{kind}</AttachmentTitle>
          <AttachmentDescription>{attachment.content_type}</AttachmentDescription>
        </AttachmentContent>
        <AttachmentTrigger
          aria-label={`Open ${kind.toLowerCase()}`}
          onClick={() => setOpen(true)}
        />
      </Attachment>
      {open && query.isPending && (
        <p
          role="status"
          className="text-sm"
        >
          Loading attachment…
        </p>
      )}
      {open && (query.isError || mediaError) && (
        <div className="space-y-2">
          <FormError message="Could not load this attachment." />
          <Button
            variant="outline"
            onPress={() => {
              setMediaError(false);
              query.refetch();
            }}
          >
            Retry attachment
          </Button>
        </div>
      )}
      {open && url && !mediaError && (
        <>
          {kind === 'Photo' ? (
            // biome-ignore lint/a11y/noNoninteractiveElementInteractions: An image load failure exposes a retry; this is not a user interaction handler.
            <img
              src={url}
              alt="Message attachment"
              className="max-h-80 max-w-full rounded-xl object-contain"
              onError={() => setMediaError(true)}
            />
          ) : kind === 'Video' ? (
            <video
              src={url}
              controls
              preload="metadata"
              className="max-h-80 max-w-full rounded-xl"
              onError={() => setMediaError(true)}
            >
              <track kind="captions" />
            </video>
          ) : (
            <audio
              src={url}
              controls
              preload="metadata"
              className="max-w-full"
              onError={() => setMediaError(true)}
            >
              <track kind="captions" />
            </audio>
          )}
        </>
      )}
      {open && url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-link block text-sm"
        >
          Open original {kind.toLowerCase()}
        </a>
      )}
    </div>
  );
}
