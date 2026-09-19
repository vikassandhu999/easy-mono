import {useEffect, useRef} from 'react';
import {Link} from 'react-router-dom';
import {useConversation} from '../api/conversation';
import {useConversationUpdates} from '../api/conversation-updates';
import {routes} from '../routes';
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
    <section className="mb-8 space-y-3">
      <h2 className="text-xl font-semibold">Your coach</h2>
      {query.data ? (
        <>
          <CachedRead
            updatedAt={query.dataUpdatedAt}
            failed={query.isError}
            refreshing={query.isFetching}
            refresh={() => query.refetch()}
          />
          <p className="text-muted-foreground">
            {query.data.data.unread_count > 0
              ? `${query.data.data.unread_count} unread ${query.data.data.unread_count === 1 ? 'message' : 'messages'} from your coach.`
              : 'Ask a question or share how things are going.'}
          </p>
          <Link
            className="text-link block"
            to={routes.messages}
          >
            Message your coach
          </Link>
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
      const navHeight = nav && nav.top < offset + height ? nav.height : 0;
      node.style.top = `${top}px`;
      node.style.height = `${Math.max(180, height - (top - offset) - navHeight)}px`;
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
