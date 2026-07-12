import {Button, Spinner, TextArea, toast} from '@heroui/react';
import {Send} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';

import {
  appendClientMessageAction,
  type ChatMessage,
  useClientMessagesInfiniteQuery,
  useCreateClientConversationMessageMutation,
  useMarkClientConversationReadMutation,
} from '@/api/conversation';
import {getApiErrorMessage} from '@/api/shared';
import AttachmentComposer from '@/messages/attachment-composer';
import MessageAttachments from '@/messages/message-attachments';
import MessageEmbed from '@/messages/message-embed';
import useAttachmentDownloadUrls from '@/messages/use-attachment-download-urls';

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'});
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
}

function MessageBubble({
  failedIds,
  message,
  refresh,
  urls,
}: {
  failedIds: Set<string>;
  message: ChatMessage;
  refresh: (ids: string[]) => Promise<void>;
  urls: Record<string, string>;
}) {
  const own = message.sender_type === 'client';
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 ${
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
          {message.body ? <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p> : null}
        </div>
        <p className={`mt-0.5 text-right text-[10px] ${own ? 'text-accent-foreground/70' : 'text-muted'}`}>
          {formatTime(message.inserted_at)}
        </p>
      </div>
    </div>
  );
}

export default function CoachChat() {
  const dispatch = useDispatch();
  const [body, setBody] = useState('');
  const [attachmentState, setAttachmentState] = useState({attachmentIds: [] as string[], busy: false, failed: false});
  const [composerKey, setComposerKey] = useState(0);
  const [sendLocked, setSendLocked] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useClientMessagesInfiniteQuery();
  const [sendMessage, {isLoading: isSendingMessage}] = useCreateClientConversationMessageMutation();
  const [markRead] = useMarkClientConversationReadMutation();

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever the message-list tail changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior: 'instant', block: 'end'});
  }, [lastMessageId]);

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
      const result = await sendMessage({
        clientChatMessageCreateRequest: {
          ...(trimmed && {body: trimmed}),
          attachment_ids: attachmentState.attachmentIds,
        },
      }).unwrap();
      dispatch(appendClientMessageAction(result.data));
      setBody('');
      setAttachmentState({attachmentIds: [], busy: false, failed: false});
      setComposerKey((current) => current + 1);
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

  const hasContent = Boolean(body.trim() || attachmentState.attachmentIds.length > 0);

  return (
    // Tab bar (h-16) stays visible below — reserve its height.
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <header className="flex min-h-12 items-center border-b border-border px-4 pt-[env(safe-area-inset-top)]">
        <h1 className="text-base font-bold">Your coach</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
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
              <p className="py-12 text-center text-sm text-muted">No messages yet. Ask your coach anything!</p>
            ) : null}
            {messages.map((message, index) => {
              const prev = messages[index - 1];
              const newDay = !prev || formatDay(prev.inserted_at) !== formatDay(message.inserted_at);
              return (
                <div key={message.id}>
                  {newDay ? (
                    <p className="my-2 text-center text-xs text-muted">{formatDay(message.inserted_at)}</p>
                  ) : null}
                  <MessageBubble
                    failedIds={failedAttachmentIds}
                    message={message}
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
          disabled={isSending}
          key={composerKey}
          onChange={handleAttachmentChange}
        />
        <div className="mt-2 flex items-end gap-2">
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
