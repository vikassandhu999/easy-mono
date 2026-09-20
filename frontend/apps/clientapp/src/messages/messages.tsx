import {MessageCircle} from 'lucide-react';
import {useEffect, useRef} from 'react';
import {useConversation} from '../api/conversation';
import {useConversationUpdates} from '../api/conversation-updates';
import {routes} from '../routes';
import {ActionCard} from '../ui/action-card';
import {CachedRead} from '../ui/cached-read';
import {useOnline} from '../ui/connection-status';
import {MessageScrollerProvider} from '../ui/message-scroller';
import {ReadState} from '../ui/read-state';
import {Composer} from './composer';
import {History} from './history';

export function TodayMessages() {
  const query = useConversation();
  useConversationUpdates(query.data?.data.id);
  return (
    <section className="mb-4 space-y-3">
      {query.data ? (
        <>
          <CachedRead
            updatedAt={query.dataUpdatedAt}
            failed={query.isError}
            refreshing={query.isFetching}
            refresh={() => query.refetch()}
          />
          <ActionCard
            title="Message your coach"
            eyebrow="You’ve got support"
            tone="coach"
            to={routes.messages}
            icon={<MessageCircle />}
            description={
              query.data.data.unread_count > 0
                ? `${query.data.data.unread_count} unread ${query.data.data.unread_count === 1 ? 'message' : 'messages'} from your coach.`
                : 'Questions, wins, or a tough day. Share it here.'
            }
          />
        </>
      ) : (
        <ReadState
          label="your conversation"
          failed={query.isError}
          retry={() => {
            query.refetch();
          }}
        />
      )}
    </section>
  );
}

export function Messages() {
  const query = useConversation();
  const status = useConversationUpdates(query.data?.data.id);
  const online = useOnline();
  const main = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({preventScroll: true});
    const node = main.current;
    if (!node) {
      return;
    }
    const measure = () => {
      const viewport = window.visualViewport;
      const offset = viewport?.offsetTop ?? 0;
      const height = viewport?.height ?? window.innerHeight;
      const header = document.querySelector('.app-header')?.getBoundingClientRect();
      const nav = document.querySelector('.mobile-nav')?.getBoundingClientRect();
      const top = Math.max(offset, header?.bottom ?? 0);
      const bottom = nav && nav.height > 0 ? Math.min(offset + height, nav.top - 8) : offset + height;
      node.style.top = `${top}px`;
      node.style.height = `${Math.max(180, bottom - top)}px`;
    };
    measure();
    window.visualViewport?.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure);
    for (const element of document.querySelectorAll('.app-header, .mobile-nav')) {
      observer.observe(element);
    }
    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, []);
  return (
    <main
      ref={main}
      className="messages-page"
    >
      <header className="shrink-0 px-5 pt-3 pb-2">
        <h1
          ref={heading}
          tabIndex={-1}
          className="text-2xl font-semibold outline-none"
        >
          Messages
        </h1>
        <p
          role="status"
          className="text-sm text-muted-foreground"
        >
          {!online
            ? 'Offline · Reconnect for new messages'
            : status === 'live'
              ? 'Conversation connected'
              : 'Connecting to live updates…'}
        </p>
      </header>
      <MessageScrollerProvider
        defaultScrollPosition="end"
        autoScroll
      >
        <History />
        <Composer />
      </MessageScrollerProvider>
    </main>
  );
}
