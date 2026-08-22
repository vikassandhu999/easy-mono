import {getInitials, stickToBottom} from '@easy/utils';
import {Avatar, Button, Spinner, TextArea, toast} from '@heroui/react';
import {useQueryClient} from '@tanstack/react-query';
import {Send} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {
  appendMessage,
  type ChatMessage,
  type ChatMessageEmbedRequest,
  parseChatMessage,
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
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {ErrorState} from '@/ui/error-state';
import {Page} from '@/ui/page';
import useAttachmentDownloadUrls from '@/ui/use-attachment-download-urls';
import {useChannelEvent} from '@/ui/use-channel-event';
import {useGoBack} from '@/ui/use-go-back';

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'});
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
}

function DaySeparator({iso}: {iso: string}) {
  return (
    <div className="flex justify-center pb-3 pt-2">
      <span className="rounded-pill bg-surface-tertiary px-3 py-1 font-semibold uppercase tracking-eyebrow text-muted type-eyebrow">
        {formatDay(iso)}
      </span>
    </div>
  );
}

function MessageBubble({
  failedIds,
  isTail,
  message,
  own,
  refresh,
  urls,
}: {
  failedIds: Set<string>;
  isTail: boolean;
  message: ChatMessage;
  own: boolean;
  refresh: (ids: string[]) => Promise<void>;
  urls: Record<string, string>;
}) {
  // Media with nothing else in the bubble reads better edge-to-edge.
  const mediaOnly = message.attachments.length > 0 && !message.body && !message.embed;
  // A text bubble tucks the time onto the last line (reserved by the spacer
  // below) instead of spending a whole extra row on "Nice one." + 10:03 PM.
  const inlineStamp = Boolean(message.body);
  const stamp = (
    <span className={own ? 'text-accent-foreground/70' : 'text-muted-2'}>{formatTime(message.inserted_at)}</span>
  );
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'relative min-w-0 max-w-[85%] overflow-hidden rounded-card sm:max-w-[75%]',
          mediaOnly ? 'p-1' : 'px-3 py-2',
          own ? 'bg-accent text-accent-foreground' : 'border border-border bg-surface text-foreground',
          isTail && (own ? 'rounded-br-chip' : 'rounded-bl-chip'),
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="grid min-w-0 gap-2">
          <MessageAttachments
            attachments={message.attachments}
            failedIds={failedIds}
            refresh={refresh}
            urls={urls}
          />
          {message.embed ? <MessageEmbed embed={message.embed} /> : null}
          {message.body ? (
            <p className="whitespace-pre-wrap wrap-break-word type-body">
              {message.body}
              <span
                aria-hidden
                className="inline-block w-14"
              />
            </p>
          ) : null}
        </div>
        {inlineStamp ? (
          <span className="absolute bottom-2 right-3 tabular-nums type-eyebrow">{stamp}</span>
        ) : (
          <p className={`text-right tabular-nums type-eyebrow ${mediaOnly ? 'px-2 pb-1 pt-1' : 'mt-1'}`}>{stamp}</p>
        )}
      </div>
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
  const scrollerRef = useRef<HTMLDivElement>(null);

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
      const message = parseChatMessage(payload);
      if (!message) {
        return;
      }
      appendMessage(conversationId, message);
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

  // Pins the scroller to its true bottom and re-pins as late media sizes up.
  // Do NOT go back to scrollIntoView on a sentinel — it cannot cover the
  // scroller's own bottom padding and fires before images have any height.
  useEffect(() => stickToBottom(scrollerRef.current), []);

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
    <Page.Frame
      // Full-bleed chat on mobile; the desktop gutter stays.
      className="flex h-dvh flex-col max-md:px-0"
      size="thread"
    >
      {/* The chat is a raised panel, not content merged into the page: white
          header/footer chrome around a tinted message canvas, carded on
          desktop, edge-to-edge on mobile. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface md:my-4 md:rounded-panel md:border md:border-border md:shadow-sm">
        <header className="flex min-h-14 items-center gap-2 border-b border-border px-4">
          <BackButton onPress={goBack} />
          <Avatar size="md">
            <Avatar.Fallback className="bg-accent-soft font-semibold text-accent">
              {getInitials(title.split(' ')[0], title.split(' ')[1]) || '?'}
            </Avatar.Fallback>
          </Avatar>
          <h1 className="min-w-0 truncate type-title font-semibold tracking-name">{title}</h1>
        </header>

        <div
          className="scrollbar-hide flex-1 overflow-y-auto bg-surface-secondary px-4 py-3"
          ref={scrollerRef}
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
            <div className="flex flex-col">
              {hasNextPage ? (
                <Button
                  className="mb-2 self-center"
                  isPending={isFetchingNextPage}
                  onPress={() => fetchNextPage()}
                  size="sm"
                  variant="secondary"
                >
                  Load older messages
                </Button>
              ) : null}
              {messages.length === 0 ? (
                <p className="py-12 text-center text-muted type-body">No messages yet. Say hello!</p>
              ) : null}
              {messages.map((message, index) => {
                const prev = messages[index - 1];
                const next = messages[index + 1];
                const day = formatDay(message.inserted_at);
                const newDay = !prev || formatDay(prev.inserted_at) !== day;
                // Consecutive messages from one sender read as a single block:
                // tight spacing, and only the last one keeps the pointed corner.
                const grouped = !newDay && prev?.sender_type === message.sender_type;
                const isTail = !next || next.sender_type !== message.sender_type || formatDay(next.inserted_at) !== day;
                return (
                  <div
                    className={grouped ? 'mt-0.5' : 'mt-3'}
                    key={message.id}
                  >
                    {newDay ? <DaySeparator iso={message.inserted_at} /> : null}
                    <MessageBubble
                      failedIds={failedAttachmentIds}
                      isTail={isTail}
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

        <footer className="border-t border-border bg-surface px-4 py-2">
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
                ×
              </Button>
            </div>
          ) : null}
          <div className="mt-1 flex items-end gap-2">
            <TextArea
              aria-label="Message"
              name="message"
              className="flex-1"
              disabled={isSending || conversationUnavailable}
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
              isDisabled={
                !hasContent || attachmentState.busy || attachmentState.failed || isSending || conversationUnavailable
              }
              isPending={isSending}
              onPress={handleSend}
            >
              <Send size={16} />
            </Button>
          </div>
        </footer>
      </div>
    </Page.Frame>
  );
}
