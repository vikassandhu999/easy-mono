import {ArrowLeft, MessageCircle} from 'lucide-react';
import {useEffect, useRef} from 'react';
import {Link} from 'react-router-dom';
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
      const safeTop = Number.parseFloat(getComputedStyle(document.body).paddingTop) || 0;
      const top = Math.max(offset, safeTop);
      const bottom = offset + height;
      node.style.top = `${top}px`;
      node.style.height = `${Math.max(180, bottom - top)}px`;
    };
    measure();
    window.visualViewport?.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);
    return () => {
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
      <header className="flex shrink-0 items-center gap-3 py-3 pr-16 pl-4">
        <Link
          to={routes.home}
          className="back-button"
          aria-label="Back to Today"
        >
          <ArrowLeft
            aria-hidden="true"
            className="size-5"
          />
        </Link>
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--coach)]">
          <MessageCircle
            aria-hidden="true"
            className="size-5"
          />
        </div>
        <div className="min-w-0">
          <h1
            ref={heading}
            tabIndex={-1}
            className="text-xl font-extrabold tracking-tight outline-none"
          >
            Messages
          </h1>
          <p
            role="status"
            className="text-xs text-muted-foreground"
          >
            {!online
              ? 'Offline · Reconnect for new messages'
              : status === 'live'
                ? 'Your coach · Conversation connected'
                : 'Connecting to live updates…'}
          </p>
        </div>
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
