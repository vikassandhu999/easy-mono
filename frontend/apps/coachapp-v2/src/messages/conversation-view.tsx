import {Button, Spinner, TextArea, Typography} from '@heroui/react';
import {ArrowLeft, Send} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
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
import {useAppDispatch} from '@/store';

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'});
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
}

function MessageBubble({message, own}: {message: ChatMessage; own: boolean}) {
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-[16px] px-3 py-[9px] shadow-[0_2px_6px_-3px_rgba(24,24,27,.2)] lg:max-w-[72%] lg:px-[13px] lg:py-[10px] ${
          own
            ? 'rounded-br-[4px] bg-link text-white'
            : 'rounded-bl-[4px] border border-separator bg-surface text-foreground'
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.45] lg:text-[13.5px] lg:leading-[1.5]">
          {message.body}
        </p>
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
  conversationId,
  embedded = false,
  initialBody = '',
  title,
}: {
  backTo: string;
  conversationId: string;
  embedded?: boolean;
  initialBody?: string;
  title: string;
}) {
  const dispatch = useAppDispatch();
  const isDesktop = useIsDesktop();
  const [body, setBody] = useState(initialBody);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useConversationMessagesInfiniteQuery({
    conversationId,
  });
  const [sendMessage, {isLoading: isSending}] = useCreateCoachConversationMessageMutation();
  const [markRead] = useMarkCoachConversationReadMutation();

  // Pages arrive newest-chunk-first, each chunk ascending → reverse pages, keep chunks.
  const messages = [...(data?.pages ?? [])].reverse().flatMap((page) => page.data);
  const lastMessageId = messages[messages.length - 1]?.id;

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
    if (!trimmed || isSending) {
      return;
    }
    const result = await sendMessage({id: conversationId, chatMessageCreateRequest: {body: trimmed}});
    if ('data' in result && result.data) {
      dispatch(appendMessageAction(conversationId, result.data.data));
      setBody('');
    }
  };

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
                    message={message}
                    own={message.sender_type === 'coach'}
                  />
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <footer
        className={`flex items-center gap-[9px] border-t border-border bg-surface lg:gap-[11px] ${embedded ? 'px-3 py-2.5 lg:px-5 lg:py-[14px]' : 'p-3'}`}
      >
        <TextArea
          aria-label="Message"
          className="min-h-10 flex-1 resize-none rounded-[12px]! border-[1.5px]! border-separator! bg-surface! px-[13px]! py-[9px]! text-[13px]! shadow-none! focus:border-focus! lg:min-h-11 lg:rounded-[13px]! lg:bg-surface-secondary! lg:px-[15px]! lg:py-[11px]! lg:text-sm! lg:focus:bg-surface!"
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={isDesktop ? 'Type a message…' : `Message ${title}…`}
          rows={1}
          value={body}
        />
        <Button
          aria-label="Send"
          className="size-10 min-w-10 rounded-[12px]! bg-focus! p-0! text-white! lg:size-11 lg:min-w-11 lg:rounded-[13px]!"
          isDisabled={!body.trim()}
          isIconOnly
          isPending={isSending}
          onPress={handleSend}
        >
          <Send className="size-[17px] lg:size-[19px]" />
        </Button>
      </footer>
    </div>
  );
}
