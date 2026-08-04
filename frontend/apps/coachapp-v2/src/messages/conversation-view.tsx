import {Button, Spinner, TextArea, toast} from '@heroui/react';
import {useQueryClient} from '@tanstack/react-query';
import {ArrowLeft, Send} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';

import {ErrorState} from '@/@components/error-state';
import useAttachmentDownloadUrls from '@/@hooks/use-attachment-download-urls';
import {useChannelEvent} from '@/@hooks/use-channel-event';
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
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-card px-3 py-2 ${
          own ? 'rounded-br-sm bg-accent text-accent-foreground' : 'rounded-bl-sm bg-surface-secondary'
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
        <p className={`mt-0.5 text-right type-eyebrow ${own ? 'text-accent-foreground/70' : 'text-muted'}`}>
          {formatTime(message.inserted_at)}
        </p>
      </div>
    </div>
  );
}

export default function ConversationView({
  backTo,
  clientId,
  conversationId,
  initialEmbed = null,
  onEmbedSent,
  title,
}: {
  backTo: string;
  clientId: string;
  conversationId: string;
  initialEmbed?: ChatMessageEmbedRequest | null;
  onEmbedSent?: () => void;
  title: string;
}) {
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [embed, setEmbed] = useState(initialEmbed);
  const [attachmentState, setAttachmentState] = useState<AttachmentComposerState>({
    attachmentIds: [],
    busy: false,
    failed: false,
  });
  const [composerKey, setComposerKey] = useState(0);
  const [sendLocked, setSendLocked] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever the message-list tail changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior: 'instant', block: 'end'});
  }, [lastMessageId]);

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
    <div className="flex h-dvh flex-col">
      <header className="flex min-h-14 items-center gap-3 border-b border-border px-4">
        <Link
          aria-label="Back"
          className="grid size-9 place-items-center rounded-chip text-muted hover:bg-surface-hover"
          to={backTo}
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="min-w-0 truncate type-body-sm font-semibold">{title}</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
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
          <div className="flex flex-col gap-2">
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
                    <p className="my-2 text-center type-eyebrow text-muted">{formatDay(message.inserted_at)}</p>
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
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <footer className="border-t border-border p-3">
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
        <div className="mt-2 flex items-end gap-2">
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
  );
}
