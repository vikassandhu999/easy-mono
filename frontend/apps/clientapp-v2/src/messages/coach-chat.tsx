import {Avatar, Button, Separator, Spinner, TextArea, toast} from '@heroui/react';
import {Send} from 'lucide-react';
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import ErrorState from '@/@components/error-state';
import useAttachmentDownloadUrls from '@/@hooks/use-attachment-download-urls';
import {
  appendClientMessage,
  type ChatMessage,
  type CreateMessageBody,
  useClientMessagesInfiniteQuery,
  useCreateClientConversationMessageMutation,
  useMarkClientConversationReadMutation,
} from '@/api/conversation';
import {useGetClientProfileQuery} from '@/api/profile';
import {getApiErrorMessage} from '@/api/shared';
import AttachmentComposer from '@/messages/attachment-composer';
import MessageAttachments from '@/messages/message-attachments';
import MessageEmbed from '@/messages/message-embed';

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
  const hasAttachments = message.attachments.length > 0;

  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs rounded-2xl px-3 py-2 ${hasAttachments ? 'w-72' : ''} ${
          own
            ? 'rounded-br-sm bg-accent text-accent-foreground'
            : 'rounded-bl-sm border border-border bg-surface text-foreground'
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
        <p className={`mt-1 text-right text-xs ${own ? 'text-accent-foreground/70' : 'text-muted'}`}>
          {formatTime(message.inserted_at)}
        </p>
      </div>
    </div>
  );
}

export default function CoachChat() {
  const [body, setBody] = useState('');
  const [attachmentState, setAttachmentState] = useState({attachmentIds: [] as string[], busy: false, failed: false});
  const [composerKey, setComposerKey] = useState(0);
  const [sendLocked, setSendLocked] = useState(false);
  const initialScrollDoneRef = useRef(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const stickToLatestRef = useRef(true);

  const {data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading, refetch} =
    useClientMessagesInfiniteQuery();
  const sendMessage = useCreateClientConversationMessageMutation();
  const isSendingMessage = sendMessage.isPending;
  const {mutate: markRead} = useMarkClientConversationReadMutation();
  const {data: profile} = useGetClientProfileQuery();
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

  // Signed images and native media controls can change height after the messages render.
  // Stay anchored only while the reader is already at the latest message.
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
        ...(trimmed && {body: trimmed}),
        attachment_ids: attachmentState.attachmentIds,
      } as CreateMessageBody);
      // A locally sent message should become visible even if the reader had
      // briefly scrolled up while composing it.
      stickToLatestRef.current = true;
      appendClientMessage(result.data);
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
    // The tab bar stays visible below; reserve its height and native safe area.
    <div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col bg-background">
      <header className="flex min-h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
        <div className="relative shrink-0">
          <Avatar
            className="size-10"
            color="accent"
          >
            <Avatar.Fallback className="font-bold">{coachInitial}</Avatar.Fallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-surface bg-success" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold">Coach {coachName}</h1>
          <p className="text-muted text-xs">Your private coaching conversation</p>
        </div>
      </header>

      <div
        aria-label={`Conversation with Coach ${coachName}`}
        className="flex-1 overscroll-contain overflow-y-auto px-3 pb-4 pt-3"
        onScroll={({currentTarget}) => {
          const bottomGap = currentTarget.scrollHeight - currentTarget.clientHeight - currentTarget.scrollTop;
          stickToLatestRef.current = bottomGap <= 48;
        }}
        ref={scrollViewportRef}
        role="log"
      >
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : isError ? (
          <div className="flex min-h-full items-center justify-center">
            <ErrorState
              message="Couldn't load your conversation."
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
              <p className="py-12 text-center text-sm text-muted">No messages yet. Ask your coach anything!</p>
            ) : null}
            {messages.map((message, index) => {
              const prev = messages[index - 1];
              const newDay = !prev || formatDay(prev.inserted_at) !== formatDay(message.inserted_at);
              return (
                <div key={message.id}>
                  {newDay ? (
                    <div className="my-4 flex items-center gap-3">
                      <Separator className="flex-1" />
                      <p className="shrink-0 font-semibold text-muted text-xs">{formatDay(message.inserted_at)}</p>
                      <Separator className="flex-1" />
                    </div>
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
          </div>
        )}
      </div>

      <footer className="border-t border-border bg-surface/95 px-3 pb-3 pt-2 backdrop-blur-lg">
        <AttachmentComposer
          disabled={isSending}
          key={composerKey}
          onChange={handleAttachmentChange}
        />
        <div className="mt-2 flex items-end gap-2 rounded-2xl bg-surface-secondary p-1.5">
          <TextArea
            aria-label="Message"
            className="min-h-11 flex-1 bg-transparent"
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
            className="min-h-11 min-w-11 shrink-0 rounded-full"
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
