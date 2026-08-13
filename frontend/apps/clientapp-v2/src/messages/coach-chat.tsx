import { stickToBottom } from '@easy/utils';
import { Button, Spinner, TextArea, toast } from '@heroui/react';
import { Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import useAttachmentDownloadUrls from '@/@hooks/use-attachment-download-urls';
import {
  appendClientMessage,
  type ChatMessage,
  type CreateMessageBody,
  useClientMessagesInfiniteQuery,
  useCreateClientConversationMessageMutation,
  useMarkClientConversationReadMutation,
} from '@/api/conversation';
import { useGetClientProfileQuery } from '@/api/profile';
import { getApiErrorMessage } from '@/api/shared';
import AttachmentComposer from '@/messages/attachment-composer';
import MessageAttachments from '@/messages/message-attachments';
import MessageEmbed from '@/messages/message-embed';

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function DaySeparator({ iso }: { iso: string }) {
  return (
    <div className="flex justify-center pb-3 pt-2">
      <span className="rounded-full bg-surface-secondary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-muted">
        {formatDay(iso)}
      </span>
    </div>
  );
}

function MessageBubble({
  failedIds,
  isTail,
  message,
  refresh,
  urls,
}: {
  failedIds: Set<string>;
  isTail: boolean;
  message: ChatMessage;
  refresh: (ids: string[]) => Promise<void>;
  urls: Record<string, string>;
}) {
  const own = message.sender_type === 'client';
  // Media with nothing else in the bubble reads better edge-to-edge.
  const mediaOnly = message.attachments.length > 0 && !message.body && !message.embed;
  // A text bubble tucks the time onto the last line (reserved by the spacer
  // below) instead of spending a whole extra row on "Nice one." + 10:03 PM.
  const inlineStamp = Boolean(message.body);
  const stamp = (
    <span className={own ? 'text-accent-foreground/70' : 'text-muted'}>{formatTime(message.inserted_at)}</span>
  );
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'relative min-w-0 max-w-[85%] overflow-hidden rounded-2xl',
          mediaOnly ? 'p-1' : 'px-3 py-2',
          own ? 'bg-accent text-accent-foreground' : 'border border-border bg-surface',
          isTail && (own ? 'rounded-br-md' : 'rounded-bl-md'),
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
            <p className="whitespace-pre-wrap wrap-break-word text-[15px] leading-snug">
              {message.body}
              <span
                aria-hidden
                className="inline-block w-12"
              />
            </p>
          ) : null}
        </div>
        {inlineStamp ? (
          <span className="absolute bottom-2 right-3 text-[10px] tabular-nums">{stamp}</span>
        ) : (
          <p className={`text-right text-[10px] tabular-nums ${mediaOnly ? 'px-2 pb-1 pt-1' : 'mt-1'}`}>{stamp}</p>
        )}
      </div>
    </div>
  );
}

export default function CoachChat() {
  const [body, setBody] = useState('');
  const [attachmentState, setAttachmentState] = useState({ attachmentIds: [] as string[], busy: false, failed: false });
  const [composerKey, setComposerKey] = useState(0);
  const [sendLocked, setSendLocked] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useClientMessagesInfiniteQuery();
  const sendMessage = useCreateClientConversationMessageMutation();
  const isSendingMessage = sendMessage.isPending;
  const { mutate: markRead } = useMarkClientConversationReadMutation();
  const { data: profile } = useGetClientProfileQuery();
  const coach = profile?.data.coach;
  const coachName = [coach?.first_name, coach?.last_name].filter(Boolean).join(' ') || 'Your coach';
  const coachInitial = coach?.first_name?.[0]?.toUpperCase() ?? 'C';

  // Pages arrive newest-chunk-first, each chunk ascending → reverse pages, keep chunks.
  const messages = [...(data?.pages ?? [])].reverse().flatMap((page) => page.data);
  const attachmentIds = messages.flatMap((message) => message.attachments.map((attachment) => attachment.id));
  const {
    failedIds: failedAttachmentIds,
    refresh: refreshAttachmentUrls,
    urls: attachmentUrls,
  } = useAttachmentDownloadUrls(attachmentIds);
  const lastMessageId = messages[messages.length - 1]?.id;
  const isSending = sendLocked || isSendingMessage;

  // The screen is visible ⇒ everything loaded is read.
  useEffect(() => {
    if (lastMessageId) {
      markRead();
    }
  }, [lastMessageId, markRead]);

  // Pins the scroller to its true bottom and re-pins as late media sizes up.
  // Do NOT go back to scrollIntoView on a sentinel — it cannot cover the
  // scroller's own bottom padding and fires before images have any height.
  useEffect(() => stickToBottom(scrollerRef.current), []);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (
      (!trimmed && attachmentState.attachmentIds.length === 0) ||
      attachmentState.busy ||
      attachmentState.failed ||
      isSending
    ) {
      return;
    }
    setSendLocked(true);
    try {
      const result = await sendMessage.mutateAsync({
        ...(trimmed && { body: trimmed }),
        attachment_ids: attachmentState.attachmentIds,
      } as CreateMessageBody);
      appendClientMessage(result.data);
      setBody('');
      setAttachmentState({ attachmentIds: [], busy: false, failed: false });
      setComposerKey((current) => current + 1);
    } catch (error) {
      toast.danger(getApiErrorMessage(error, "Message wasn't sent. Try again."));
    } finally {
      setSendLocked(false);
    }
  };

  const handleAttachmentChange = useCallback(
    (state: { attachmentIds: string[]; busy: boolean; failed: boolean }) => setAttachmentState(state),
    [],
  );

  const hasContent = Boolean(body.trim() || attachmentState.attachmentIds.length > 0);

  return (
    // Tab bar (h-16) stays visible below — reserve its height.
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <header className="flex min-h-14 items-center gap-3 border-b border-border bg-background px-5 pt-[env(safe-area-inset-top)]">
        <span className="relative grid size-9.5 place-items-center rounded-full bg-accent text-sm font-extrabold text-white">
          {coachInitial}
          <i className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-success" />
        </span>
        <span>
          <h1 className="text-[15px] font-extrabold">Coach {coachName}</h1>
          <span className="block text-[11px] font-semibold text-success-secondary">Online</span>
        </span>
      </header>

      <div
        className="scrollbar-hide flex-1 overflow-y-auto px-4 py-3"
        ref={scrollerRef}
      >
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
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
              <p className="py-12 text-center text-sm text-muted">No messages yet. Ask your coach anything!</p>
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
                    refresh={refreshAttachmentUrls}
                    urls={attachmentUrls}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="border-t border-border bg-[rgba(244,244,242,0.96)] px-3 pb-3 pt-2 backdrop-blur-[10px]">
        <AttachmentComposer
          disabled={isSending}
          key={composerKey}
          onChange={handleAttachmentChange}
        />
        <div className="mt-1 flex items-end gap-2">
          <TextArea
            aria-label="Message"
            className="min-h-11 flex-1"
            disabled={isSending}
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
            className="min-h-11 min-w-11"
            isDisabled={!hasContent || attachmentState.busy || attachmentState.failed || isSending}
            isIconOnly
            isPending={isSending}
            onPress={handleSend}
          >
            <Send size={16} />
          </Button>
        </div>
      </footer>
    </div>
  );
}
