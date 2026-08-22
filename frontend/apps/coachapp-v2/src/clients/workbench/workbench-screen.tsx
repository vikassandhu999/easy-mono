import {isOneOf} from '@easy/utils/closed-vocabulary';
import {Button, Skeleton} from '@heroui/react';
import {CheckCircle2, ChevronLeft, UserPlus} from 'lucide-react';
import type {ReactNode} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {useListClientsQuery} from '@/api/clients';
import {useWorkbenchCountsQuery} from '@/api/workbench';
import {workbenchCount} from '@/clients/workbench-counts';
import {queueEntries, queueMeta, TODAY_QUEUES, type WorkbenchQueueId} from '@/clients/workbench-queues';
import {ROUTES} from '@/routes';
import {EmptyState} from '@/ui/empty-state';
import {Page} from '@/ui/page';
import {TodayCard} from '@/ui/today-card';
import AllClientsView from './all-clients-view';
import CheckInsView from './check-ins-view';
import {ExpiringView, QuietView} from './expiring-quiet-views';
import OnboardingView from './onboarding-view';
import ProgrammingView, {ProgrammingToolbar} from './programming-view';
import {WorkbenchRail} from './rail';
import RepliesView from './replies-view';
import {ViewShell} from './view-shell';

/**
 * The coach workbench — the surface that replaced the clients listing
 * (spec: docs/archive/specs/2026-08-06-coach-workbench-spec.md).
 * A rail of drainable queues is primary. Roster-wide search and the message
 * inbox are modals in the Today card's utility footer (2026-08-08) — the
 * workbench's messaging WORK is the Replies queue. The roster view
 * (`?view=all`, with status filters) survives as the counts-error fallback
 * and the caught-up pane's target.
 *
 * Queue selection lives in the URL (`?view=`), and the URL is also the mobile
 * navigation level (push-nav, decision 2026-08-07): below `lg`, no `?view=`
 * shows the Today card as a full-width menu, `?view=X` is drilled into that
 * queue with a "‹ Today" row — so browser Back pops a drill-in and deep links
 * land drilled. Desktop ignores the levels: the rail is always visible and a
 * missing `?view=` auto-lands on the first queue with work (spec §11.1).
 */

type ViewId = 'all' | WorkbenchQueueId;

const VIEW_IDS: ViewId[] = ['all', ...TODAY_QUEUES.map((queue) => queue.id)];

function parseView(raw: null | string): undefined | ViewId {
  return isOneOf(VIEW_IDS, raw) ? raw : undefined;
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

  const requested = parseView(searchParams.get('view'));
  const firstNonEmpty = counts
    ? TODAY_QUEUES.find((queue) => workbenchCount(counts, queue.countKey) > 0)?.id
    : undefined;
  // Landing view (spec §11.1): the first queue with work; the caught-up pane
  // when every queue is drained; the roster only when counts can't load.
  const view: 'caught-up' | undefined | ViewId =
    requested ?? (countsQuery.isError ? 'all' : counts ? (firstNonEmpty ?? 'caught-up') : undefined);

  const todayEntries = queueEntries(counts);
  const selectView = (id: string) => setSearchParams({view: id});

  const activeQueue = TODAY_QUEUES.find((queue) => queue.id === view);

  // Mobile levels (desktop ignores both): no explicit `?view=` means the
  // menu; a `?view=` means drilled into that queue.
  const menuMode = requested === undefined;
  const drillLabel = activeQueue?.label ?? (requested === 'all' ? 'All clients' : undefined);

  const queueMetaLine =
    counts && activeQueue ? queueMeta(activeQueue, workbenchCount(counts, activeQueue.countKey)) : undefined;

  let content: ReactNode;
  if (view === undefined) {
    content = <ContentSkeleton />;
  } else if (view === 'caught-up') {
    content = (
      <ViewShell title="Today">
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
      </ViewShell>
    );
  } else if (view === 'all') {
    content = <AllClientsView />;
  } else if (view === 'check-ins') {
    content = (
      <ViewShell
        meta={queueMetaLine}
        title="Check-ins"
      >
        <CheckInsView />
      </ViewShell>
    );
  } else if (view === 'replies') {
    content = (
      <ViewShell
        meta={queueMetaLine}
        title="Replies"
      >
        <RepliesView />
      </ViewShell>
    );
  } else if (view === 'programming') {
    content = (
      <ViewShell
        meta={queueMetaLine}
        title="Programming"
        toolbar={<ProgrammingToolbar />}
      >
        <ProgrammingView />
      </ViewShell>
    );
  } else if (view === 'expiring') {
    content = (
      <ViewShell
        meta={queueMetaLine}
        title="Expiring"
      >
        <ExpiringView />
      </ViewShell>
    );
  } else if (view === 'quiet') {
    content = (
      <ViewShell
        meta={queueMetaLine}
        title="Quiet"
      >
        <QuietView />
      </ViewShell>
    );
  } else {
    content = (
      <ViewShell
        meta={queueMetaLine}
        title="Onboarding"
      >
        <OnboardingView />
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
          className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-1 lg:flex-row lg:gap-8"
          size="wide"
        >
          <WorkbenchRail
            active={view}
            entries={todayEntries}
            onSelect={selectView}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex min-w-0 flex-col gap-3 lg:hidden">
              {menuMode ? (
                <TodayCard
                  detailed
                  entries={todayEntries}
                  onSelect={selectView}
                />
              ) : null}
              {!menuMode ? (
                <Button
                  className="button--row h-8 w-fit justify-start gap-1 rounded-control px-2 type-body font-medium text-muted"
                  onPress={() => setSearchParams({})}
                  variant="ghost"
                >
                  <ChevronLeft className="size-4" />
                  Today
                  {drillLabel ? <span className="text-foreground">· {drillLabel}</span> : null}
                </Button>
              ) : null}
            </div>
            <div
              className={
                menuMode ? 'hidden min-w-0 flex-1 flex-col gap-3 lg:flex' : 'flex min-w-0 flex-1 flex-col gap-3'
              }
            >
              {content}
            </div>
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
