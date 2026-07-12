import {Button, Spinner, TextArea, Typography, toast} from '@heroui/react';
import {ArrowLeft, Send} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';

import {useChannelEvent} from '@/@hooks/use-channel-event';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {api} from '@/api/base';
import {
  appendMessageAction,
  type ChatMessage,
  useConversationMessagesInfiniteQuery,
  useCreateCoachConversationMessageMutation,
  useMarkCoachConversationReadMutation,
} from '@/api/conversations';
import type {ChatMessageEmbedRequest} from '@/api/generated';
import {getApiErrorMessage} from '@/api/shared';
import AttachmentComposer from '@/messages/attachment-composer';
import MessageAttachments from '@/messages/message-attachments';
import MessageEmbed from '@/messages/message-embed';
import useAttachmentDownloadUrls from '@/messages/use-attachment-download-urls';
import {useAppDispatch} from '@/store';

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
        className={`max-w-[80%] rounded-[16px] px-3 py-[9px] shadow-[0_2px_6px_-3px_rgba(24,24,27,.2)] lg:max-w-[72%] lg:px-[13px] lg:py-[10px] ${
          own
            ? 'rounded-br-[4px] bg-link text-white'
            : 'rounded-bl-[4px] border border-separator bg-surface text-foreground'
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
          {message.body ? (
            <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.45] lg:text-[13.5px] lg:leading-[1.5]">
              {message.body}
            </p>
          ) : null}
        </div>
        <p
          className={`mt-1 text-left text-[10px] font-normal lg:text-right lg:font-semibold ${own ? 'text-white/70' : 'text-field-placeholder'}`}
        >
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
  embedded = false,
  initialEmbed = null,
  onEmbedSent,
  title,
}: {
  backTo: string;
  clientId: string;
  conversationId: string;
  embedded?: boolean;
  initialEmbed?: ChatMessageEmbedRequest | null;
  onEmbedSent?: () => void;
  title: string;
}) {
  const dispatch = useAppDispatch();
  const isDesktop = useIsDesktop();
  const [body, setBody] = useState('');
  const [embed, setEmbed] = useState(initialEmbed);
  const [attachmentState, setAttachmentState] = useState({attachmentIds: [] as string[], busy: false, failed: false});
  const [composerKey, setComposerKey] = useState(0);
  const [sendLocked, setSendLocked] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useConversationMessagesInfiniteQuery({
    conversationId,
  });
  const [sendMessage, {isLoading: isSendingMessage}] = useCreateCoachConversationMessageMutation();
  const [markRead] = useMarkCoachConversationReadMutation();

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

  useChannelEvent(
    `conversation:${conversationId}`,
    'message_new',
    (payload) => {
      dispatch(appendMessageAction(conversationId, payload as ChatMessage));
      dispatch(api.util.invalidateTags([{type: 'Conversation', id: 'LIST'}]));
    },
    // Refetch anything missed while the socket was down (fires on every rejoin).
    () =>
      dispatch(
        api.util.invalidateTags([
          {type: 'ChatMessage', id: conversationId},
          {type: 'Conversation', id: 'LIST'},
        ]),
      ),
  );

  // Everything currently loaded is on screen → advance the read cursor.
  useEffect(() => {
    if (lastMessageId) {
      markRead({id: conversationId});
    }
  }, [conversationId, lastMessageId, markRead]);

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
      const result = await sendMessage({
        id: conversationId,
        coachChatMessageCreateRequest: {
          ...(trimmed && {body: trimmed}),
          attachment_ids: attachmentState.attachmentIds,
          ...(embed && {embed}),
        },
      }).unwrap();
      dispatch(appendMessageAction(conversationId, result.data));
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

  const handleAttachmentChange = useCallback(
    (state: {attachmentIds: string[]; busy: boolean; failed: boolean}) => setAttachmentState(state),
    [],
  );

  const hasContent = Boolean(body.trim() || attachmentState.attachmentIds.length > 0 || embed);

  return (
    <div className={`flex flex-col ${embedded ? 'h-full' : 'h-dvh'}`}>
      {embedded ? (
        <header className="hidden min-h-[49px] items-center border-b border-separator bg-surface px-5 text-[13px] font-bold lg:flex">
          Conversation
        </header>
      ) : (
        <header className="flex min-h-14 items-center gap-3 border-b border-border px-4">
          <Link
            aria-label="Back"
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-hover"
            to={backTo}
          >
            <ArrowLeft size={18} />
          </Link>
          <Typography
            truncate
            type="body-sm"
            weight="semibold"
          >
            {title}
          </Typography>
        </header>
      )}

      <div className={`flex-1 overflow-y-auto ${embedded ? 'px-[14px] py-4 lg:px-7 lg:py-6' : 'px-4 py-3'}`}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="sm" />
          </div>
        ) : (
          <div className="flex flex-col gap-[10px] lg:gap-3">
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
              <p className="py-12 text-center text-sm text-muted">No messages yet. Say hello!</p>
            ) : null}
            {messages.map((message, index) => {
              const prev = messages[index - 1];
              const newDay = !prev || formatDay(prev.inserted_at) !== formatDay(message.inserted_at);
              return (
                <div key={message.id}>
                  {newDay ? (
                    <p className="mx-auto hidden w-fit rounded-full [background-color:var(--surface-emphasis)] px-3 py-1 text-[11px] font-semibold text-muted lg:block">
                      {formatDay(message.inserted_at)}
                    </p>
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

      <footer className={`border-t border-border bg-surface ${embedded ? 'px-3 py-2.5 lg:px-5 lg:py-[14px]' : 'p-3'}`}>
        <AttachmentComposer
          clientId={clientId}
          disabled={isSending}
          key={composerKey}
          onChange={handleAttachmentChange}
        />
        {embed ? (
          <div className="mt-2 flex items-start gap-2">
            <div className="min-w-0 flex-1 rounded-xl border border-border bg-surface-secondary px-3 py-2 text-sm">
              Check-in attached for feedback
            </div>
            <Button
              aria-label="Remove check-in"
              className="min-h-11 min-w-11"
              isDisabled={isSending}
              isIconOnly
              onPress={() => setEmbed(null)}
              variant="secondary"
            >
              ×
            </Button>
          </div>
        ) : null}
        <div className="mt-2 flex items-center gap-[9px] lg:gap-[11px]">
          <TextArea
            aria-label="Message"
            className="min-h-11 flex-1 resize-none rounded-[12px]! border-[1.5px]! border-separator! bg-surface! px-[13px]! py-[9px]! text-[13px]! shadow-none! focus:border-focus! lg:rounded-[13px]! lg:bg-surface-secondary! lg:px-[15px]! lg:py-[11px]! lg:text-sm! lg:focus:bg-surface!"
            disabled={isSending}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend().catch(() => undefined);
              }
            }}
            placeholder={isDesktop ? 'Type a message…' : `Message ${title}…`}
            rows={1}
            value={body}
          />
          <Button
            aria-label="Send"
            className="size-11 min-w-11 rounded-[12px]! bg-focus! p-0! text-white! lg:rounded-[13px]!"
            isDisabled={!hasContent || attachmentState.busy || attachmentState.failed || isSending}
            isIconOnly
            isPending={isSending}
            onPress={handleSend}
          >
            <Send className="size-[17px] lg:size-[19px]" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
