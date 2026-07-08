import {Button, Spinner, TextArea, Typography} from '@heroui/react';
import {ArrowLeft, Send} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';

import {useChannelEvent} from '@/@hooks/use-channel-event';
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
        className={`max-w-[80%] rounded-2xl px-3 py-2 ${
          own ? 'rounded-br-sm bg-accent text-accent-foreground' : 'rounded-bl-sm bg-surface-secondary'
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
        <p className={`mt-0.5 text-right text-[10px] ${own ? 'text-accent-foreground/70' : 'text-muted'}`}>
          {formatTime(message.inserted_at)}
        </p>
      </div>
    </div>
  );
}

export default function ConversationView({
  backTo,
  conversationId,
  title,
}: {
  backTo: string;
  conversationId: string;
  title: string;
}) {
  const dispatch = useAppDispatch();
  const [body, setBody] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useConversationMessagesInfiniteQuery({
    conversationId,
  });
  const [sendMessage, {isLoading: isSending}] = useCreateCoachConversationMessageMutation();
  const [markRead] = useMarkCoachConversationReadMutation();

  // Pages arrive newest-chunk-first, each chunk ascending → reverse pages, keep chunks.
  const messages = [...(data?.pages ?? [])].reverse().flatMap((page) => page.data);
  const lastMessageId = messages[messages.length - 1]?.id;

  useChannelEvent(`conversation:${conversationId}`, 'message_new', (payload) => {
    dispatch(appendMessageAction(conversationId, payload as ChatMessage));
    dispatch(api.util.invalidateTags([{type: 'Conversation', id: 'LIST'}]));
  });

  // Everything currently loaded is on screen → advance the read cursor.
  useEffect(() => {
    if (lastMessageId) {
      markRead({id: conversationId});
    }
  }, [conversationId, lastMessageId, markRead]);

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
    <div className="flex h-dvh flex-col">
      <header className="flex min-h-14 items-center gap-3 border-b border-border px-4">
        <Link
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

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="sm" />
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
              <p className="py-12 text-center text-sm text-muted">No messages yet. Say hello!</p>
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

      <footer className="flex items-end gap-2 border-t border-border p-3">
        <TextArea
          aria-label="Message"
          className="flex-1"
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Write a message…"
          rows={1}
          value={body}
        />
        <Button
          aria-label="Send"
          isDisabled={!body.trim()}
          isPending={isSending}
          onPress={handleSend}
        >
          <Send size={16} />
        </Button>
      </footer>
    </div>
  );
}
