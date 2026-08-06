import {Button, Skeleton, Typography} from '@heroui/react';
import {CheckCircle2, UserPlus} from 'lucide-react';
import type {ReactNode} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';

import {ConversationInboxList} from '@/@components/conversation-inbox-list';
import {EmptyState} from '@/@components/empty-state';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import type {ClientQueue} from '@/api/clients';
import {useListClientsQuery} from '@/api/clients';
import {useListCoachConversationsQuery} from '@/api/conversations';
import {useWorkbenchCountsQuery, type WorkbenchCounts} from '@/api/workbench';

import AllClientsView from './all-clients-view';
import CheckInsView from './check-ins-view';
import ClientQueueView from './client-queue-view';
import {type RailEntry, WorkbenchChips, WorkbenchRail} from './rail';
import RepliesView from './replies-view';

/**
 * The coach workbench — the surface that replaced the clients listing
 * (spec: docs/superpowers/specs/2026-08-06-coach-workbench-spec.md).
 * A rail of drainable queues is primary; the roster and the message inbox are
 * demoted to Browse. Queue selection lives in the URL (`?view=`) so Back
 * returns to the same queue.
 */

const CLIENT_QUEUES = ['programming', 'expiring', 'quiet', 'new'] as const;
type ViewId = 'all' | 'check-ins' | 'messages' | 'replies' | (typeof CLIENT_QUEUES)[number];

type QueueDef = {
  countKey: keyof WorkbenchCounts;
  id: Exclude<ViewId, 'all'>;
  label: string;
  meta: (count: number) => string;
  muted?: boolean;
  title: string;
};

// Order is the coach's morning sequence: review what came in, answer who's
// waiting, fix what's about to lapse, welcome who's new (spec §3).
const TODAY: QueueDef[] = [
  {
    countKey: 'check_ins',
    id: 'check-ins',
    label: 'Check-ins',
    meta: (n) => `${n} to review, oldest first`,
    title: 'Check-ins',
  },
  {
    countKey: 'replies',
    id: 'replies',
    label: 'Replies',
    meta: (n) => `${n} waiting on you, longest first`,
    title: 'Replies',
  },
  {
    countKey: 'programming',
    id: 'programming',
    label: 'Programming',
    meta: (n) => `${n} running out of programming`,
    title: 'Programming',
  },
  {
    countKey: 'expiring',
    id: 'expiring',
    label: 'Expiring',
    meta: (n) => `${n} renewals due within 7 days`,
    title: 'Expiring',
  },
  {
    countKey: 'quiet',
    id: 'quiet',
    label: 'Quiet',
    meta: (n) => `${n} gone quiet, longest first`,
    title: 'Quiet',
  },
  {
    countKey: 'new_clients',
    id: 'new',
    label: 'New clients',
    meta: (n) => `${n} in onboarding`,
    muted: true,
    title: 'New clients',
  },
];

const VIEW_IDS: ViewId[] = ['all', 'messages', ...TODAY.map((queue) => queue.id)];

function parseView(raw: null | string): undefined | ViewId {
  return VIEW_IDS.includes(raw as ViewId) ? (raw as ViewId) : undefined;
}

function ViewShell({children, meta, title}: {children: ReactNode; meta?: string; title: string}) {
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-3">
      <header className="flex items-baseline justify-between gap-3">
        <Typography
          className="font-grotesk"
          type="h6"
        >
          {title}
        </Typography>
        {meta ? (
          <Typography
            color="muted"
            type="body-xs"
          >
            {meta}
          </Typography>
        ) : null}
      </header>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-surface">
        {children}
      </div>
    </section>
  );
}

function ContentSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <Skeleton className="h-6 w-40 rounded-chip" />
      <Skeleton className="h-72 w-full rounded-card" />
    </div>
  );
}

export default function WorkbenchScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const countsQuery = useWorkbenchCountsQuery();
  const counts = countsQuery.data?.data;
  const {data: summaryData} = useListClientsQuery({limit: 0});
  const {data: conversationsData} = useListCoachConversationsQuery();
  const unread = (conversationsData?.data ?? []).reduce((sum, c) => sum + c.unread_count, 0);

  const requested = parseView(searchParams.get('view'));
  const firstNonEmpty = counts ? TODAY.find((queue) => counts[queue.countKey] > 0)?.id : undefined;
  // Landing view (spec §11.1): the first queue with work; the caught-up pane
  // when every queue is drained; the roster only when counts can't load.
  const view: 'caught-up' | undefined | ViewId =
    requested ?? (countsQuery.isError ? 'all' : counts ? (firstNonEmpty ?? 'caught-up') : undefined);

  const todayEntries: RailEntry[] = TODAY.map((queue) => ({
    count: counts?.[queue.countKey],
    id: queue.id,
    label: queue.label,
    muted: queue.muted,
  }));
  // The inbox renders inline like every other view; its count keeps unread
  // semantics because it is an awareness surface, not a work queue (spec §6).
  const browseEntries: RailEntry[] = [
    {id: 'all', label: 'All clients'},
    {id: 'messages', count: unread, label: 'Messages'},
  ];

  const selectView = (id: string) => setSearchParams({view: id});

  const activeQueue = TODAY.find((queue) => queue.id === view);

  let content: ReactNode;
  if (view === undefined) {
    content = <ContentSkeleton />;
  } else if (view === 'caught-up') {
    content = (
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-surface">
        <EmptyState
          action={
            <Button
              onPress={() => selectView('all')}
              size="sm"
              variant="secondary"
            >
              View all clients
            </Button>
          }
          body={summaryData ? `${summaryData.summary.active} clients, all on track.` : 'Everything is on track.'}
          icon={CheckCircle2}
          title="You're caught up."
        />
      </div>
    );
  } else if (view === 'all') {
    content = <AllClientsView />;
  } else if (view === 'messages') {
    content = (
      <ViewShell
        meta={unread > 0 ? `${unread} unread ${unread === 1 ? 'message' : 'messages'}` : undefined}
        title="Messages"
      >
        <ConversationInboxList />
      </ViewShell>
    );
  } else if (view === 'check-ins') {
    content = (
      <ViewShell
        meta={counts ? activeQueue?.meta(counts[activeQueue.countKey]) : undefined}
        title="Check-ins"
      >
        <CheckInsView />
      </ViewShell>
    );
  } else if (view === 'replies') {
    content = (
      <ViewShell
        meta={counts ? activeQueue?.meta(counts[activeQueue.countKey]) : undefined}
        title="Replies"
      >
        <RepliesView />
      </ViewShell>
    );
  } else {
    content = (
      <ViewShell
        meta={counts && activeQueue ? activeQueue.meta(counts[activeQueue.countKey]) : undefined}
        title={activeQueue?.title ?? ''}
      >
        <ClientQueueView queue={view as ClientQueue} />
      </ViewShell>
    );
  }

  return (
    <Page>
      <Page.Header size="wide">
        <Page.TitleGroup>
          <Page.Title>Clients</Page.Title>
          <Page.Description className="hidden truncate sm:block">
            {summaryData
              ? `${summaryData.summary.active} active · ${summaryData.summary.pending} invited`
              : 'Your coaching workbench'}
          </Page.Description>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            aria-label="Invite client"
            className="tap-target rounded-control"
            onPress={() => navigate(ROUTES.INVITE_CLIENT)}
            variant="primary"
          >
            <UserPlus />
            <span className="hidden sm:inline">Invite client</span>
          </Button>
        </Page.Actions>
      </Page.Header>

      <Page.Content bare>
        <Page.Frame
          className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-6 pt-1 lg:flex-row lg:gap-8"
          size="wide"
        >
          <WorkbenchRail
            active={view}
            browse={browseEntries}
            onSelect={selectView}
            today={todayEntries}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <WorkbenchChips
              active={view}
              browse={browseEntries}
              onSelect={selectView}
              today={todayEntries}
            />
            {content}
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
