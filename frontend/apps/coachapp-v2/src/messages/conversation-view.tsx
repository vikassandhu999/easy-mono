import {Avatar, Button, Separator, Spinner, Surface, TextArea, toast} from '@heroui/react';
import {useQueryClient} from '@tanstack/react-query';
import {Send, X} from 'lucide-react';
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import useAttachmentDownloadUrls from '@/@hooks/use-attachment-download-urls';
import {useChannelEvent} from '@/@hooks/use-channel-event';
import {useGoBack} from '@/@hooks/use-go-back';
import {
  appendMessage,
  type ChatMessage,
  type ChatMessageEmbedRequest,
  useConversationMessagesInfiniteQuery,
  useCreateCoachConversationMessageMutation,
  useMarkCoachConversationReadMutation,
} from '@/api/conversations';
import {conversationKeys} from '@/api/keys';
import {getApiErrorMessage} from '@/api/shared';
import AttachmentComposer from '@/messages/attachment-composer';
import MessageAttachments from '@/messages/message-attachments';
import MessageEmbed from '@/messages/message-embed';
import type {AttachmentComposerState} from '@/messages/use-attachment-composer';

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'});
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
}

function MessageBubble({
  failedIds,
  message,
  own,
  refresh,
  urls,
}: {
  failedIds: Set<string>;
  message: ChatMessage;
  own: boolean;
  refresh: (ids: string[]) => Promise<void>;
  urls: Record<string, string>;
}) {
  const hasAttachments = message.attachments.length > 0;

  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <Surface
        className={`max-w-md rounded-card px-3 py-2 ${hasAttachments ? 'w-72' : ''} ${
          own
            ? 'rounded-br-control bg-accent text-accent-foreground'
            : 'rounded-bl-control border border-border bg-surface text-foreground'
        }`}
      >
        <div className="grid gap-2">
          <MessageAttachments
            attachments={message.attachments}
            failedIds={failedIds}
            refresh={refresh}
            urls={urls}
          />
          {message.embed ? <MessageEmbed embed={message.embed} /> : null}
          {message.body ? <p className="whitespace-pre-wrap wrap-break-word type-body">{message.body}</p> : null}
        </div>
        <p className={`mt-1 text-right type-eyebrow ${own ? 'text-accent-foreground/70' : 'text-muted'}`}>
          {formatTime(message.inserted_at)}
        </p>
      </Surface>
    </div>
  );
}

export default function ConversationView({
  clientId,
  conversationId,
  initialEmbed = null,
  onEmbedSent,
  title,
}: {
  clientId: string;
  conversationId: string;
  initialEmbed?: ChatMessageEmbedRequest | null;
  onEmbedSent?: () => void;
  title: string;
}) {
  const qc = useQueryClient();
  const goBack = useGoBack(ROUTES.CLIENT_DETAIL.replace(':id', clientId));
  const [body, setBody] = useState('');
  const [embed, setEmbed] = useState(initialEmbed);
  const [attachmentState, setAttachmentState] = useState<AttachmentComposerState>({
    attachmentIds: [],
    busy: false,
    failed: false,
  });
  const [composerKey, setComposerKey] = useState(0);
  const [sendLocked, setSendLocked] = useState(false);
  const initialScrollDoneRef = useRef(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const stickToLatestRef = useRef(true);

  const {data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading, refetch} =
    useConversationMessagesInfiniteQuery(conversationId);
  const sendMessageMutation = useCreateCoachConversationMessageMutation();
  const markReadMutation = useMarkCoachConversationReadMutation();

  // Pages arrive newest-chunk-first, each chunk ascending → reverse pages, keep chunks.
  const messages = [...(data?.pages ?? [])].reverse().flatMap((page) => page.data);
  const attachmentIds = messages.flatMap((message) => message.attachments.map((attachment) => attachment.id));
  const {
    failedIds: failedAttachmentIds,
    refresh: refreshAttachmentUrls,
    urls: attachmentUrls,
  } = useAttachmentDownloadUrls(attachmentIds);
  const lastMessageId = messages[messages.length - 1]?.id;
  const isSending = sendLocked || sendMessageMutation.isPending;
  const conversationUnavailable = isError && !data;

  useChannelEvent(
    `conversation:${conversationId}`,
    'message_new',
    (payload) => {
      appendMessage(conversationId, payload as ChatMessage);
      qc.invalidateQueries({queryKey: conversationKeys.lists()});
    },
    // Refetch anything missed while the socket was down (fires on every rejoin).
    () => {
      qc.invalidateQueries({queryKey: conversationKeys.messages(conversationId)});
      qc.invalidateQueries({queryKey: conversationKeys.lists()});
    },
  );

  // Everything currently loaded is on screen → advance the read cursor.
  useEffect(() => {
    if (lastMessageId) {
      markReadMutation.mutate(conversationId);
    }
  }, [conversationId, lastMessageId, markReadMutation.mutate]);

  const scrollToLatest = useCallback(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) {
      return;
    }
    viewport.scrollTop = viewport.scrollHeight;
    stickToLatestRef.current = true;
  }, []);

  // Directly scroll the viewport: a trailing flex gap and viewport padding sit below
  // the old zero-height sentinel, so scrollIntoView always stopped short of the end.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever the message-list tail changes
  useLayoutEffect(() => {
    if (!isLoading && (!initialScrollDoneRef.current || stickToLatestRef.current)) {
      scrollToLatest();
      initialScrollDoneRef.current = true;
    }
  }, [isLoading, lastMessageId, scrollToLatest]);

  // Signed media changes size after the message rows render. Follow those changes
  // only while the coach is already reading the latest part of the conversation.
  // biome-ignore lint/correctness/useExhaustiveDependencies: loading swaps the observed message-list node into the DOM
  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) {
      return;
    }
    const observer = new ResizeObserver(() => {
      if (stickToLatestRef.current) {
        scrollToLatest();
      }
    });
    observer.observe(messageList);
    return () => observer.disconnect();
  }, [isLoading, scrollToLatest]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (
      (!trimmed && attachmentState.attachmentIds.length === 0 && !embed) ||
      attachmentState.busy ||
      attachmentState.failed ||
      isSending
    ) {
      return;
    }
    const submittedEmbed = embed;
    setSendLocked(true);
    try {
      const result = await sendMessageMutation.mutateAsync({
        id: conversationId,
        body: {
          ...(trimmed && {body: trimmed}),
          attachment_ids: attachmentState.attachmentIds,
          ...(embed && {embed}),
        },
      });
      stickToLatestRef.current = true;
      appendMessage(conversationId, result.data);
      setBody('');
      setAttachmentState({attachmentIds: [], busy: false, failed: false});
      setEmbed(null);
      setComposerKey((current) => current + 1);
      if (submittedEmbed) {
        onEmbedSent?.();
      }
    } catch (error) {
      toast.danger(getApiErrorMessage(error, "Message wasn't sent. Try again."));
    } finally {
      setSendLocked(false);
    }
  };

  const handleAttachmentChange = useCallback((state: AttachmentComposerState) => setAttachmentState(state), []);

  const hasContent = Boolean(body.trim() || attachmentState.attachmentIds.length > 0 || embed);

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col bg-background lg:col-span-2">
      <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-border bg-surface/95 py-2 backdrop-blur-lg">
        <BackButton onPress={goBack} />
        <Avatar size="sm">
          <Avatar.Fallback className="bg-accent-soft font-semibold text-accent">
            {title.trim().charAt(0).toUpperCase() || 'C'}
          </Avatar.Fallback>
        </Avatar>
        <Page.TitleGroup>
          <Page.Title>{title}</Page.Title>
          <Page.Description>Private client conversation</Page.Description>
        </Page.TitleGroup>
      </header>

      <div
        aria-label={`Conversation with ${title}`}
        className="flex-1 overscroll-contain overflow-y-auto py-3"
        onScroll={({currentTarget}) => {
          const bottomGap = currentTarget.scrollHeight - currentTarget.clientHeight - currentTarget.scrollTop;
          stickToLatestRef.current = bottomGap <= 48;
        }}
        ref={scrollViewportRef}
        role="log"
      >
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="sm" />
          </div>
        ) : conversationUnavailable ? (
          <div className="py-12">
            <ErrorState
              message="Couldn't load messages."
              onRetry={() => refetch()}
            />
          </div>
        ) : (
          <div
            className="flex min-h-full flex-col justify-end gap-2"
            ref={messageListRef}
          >
            {hasNextPage ? (
              <Button
                className="self-center"
                isPending={isFetchingNextPage}
                onPress={() => fetchNextPage()}
                size="sm"
                variant="secondary"
              >
                Load older messages
              </Button>
            ) : null}
            {messages.length === 0 ? (
              <p className="py-12 text-center type-body text-muted">No messages yet. Say hello!</p>
            ) : null}
            {messages.map((message, index) => {
              const prev = messages[index - 1];
              const newDay = !prev || formatDay(prev.inserted_at) !== formatDay(message.inserted_at);
              return (
                <div key={message.id}>
                  {newDay ? (
                    <div className="my-4 flex items-center gap-3">
                      <Separator className="flex-1" />
                      <p className="shrink-0 type-eyebrow font-semibold text-muted">{formatDay(message.inserted_at)}</p>
                      <Separator className="flex-1" />
                    </div>
                  ) : null}
                  <MessageBubble
                    failedIds={failedAttachmentIds}
                    message={message}
                    own={message.sender_type === 'coach'}
                    refresh={refreshAttachmentUrls}
                    urls={attachmentUrls}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-border bg-surface/95 py-3 backdrop-blur-lg">
        <AttachmentComposer
          clientId={clientId}
          disabled={isSending || conversationUnavailable}
          key={composerKey}
          onChange={handleAttachmentChange}
        />
        {embed ? (
          <div className="mt-2 flex items-start gap-2">
            <div className="min-w-0 flex-1 rounded-panel border border-border bg-surface-secondary px-3 py-2 type-body">
              Check-in attached for feedback
            </div>
            <Button
              aria-label="Remove check-in"
              isDisabled={isSending}
              isIconOnly
              onPress={() => setEmbed(null)}
              variant="secondary"
            >
              <X size={16} />
            </Button>
          </div>
        ) : null}
        <Surface className="mt-2 flex items-end gap-2 rounded-panel bg-surface-secondary p-1.5">
          <TextArea
            aria-label="Message"
            className="flex-1 bg-transparent"
            disabled={isSending || conversationUnavailable}
            name="message"
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend().catch(() => undefined);
              }
            }}
            placeholder="Write a message…"
            rows={1}
            value={body}
          />
          <Button
            aria-label="Send"
            className="shrink-0"
            isDisabled={
              !hasContent || attachmentState.busy || attachmentState.failed || isSending || conversationUnavailable
            }
            isIconOnly
            isPending={isSending}
            onPress={handleSend}
          >
            <Send size={16} />
          </Button>
        </Surface>
      </footer>
    </section>
  );
}
