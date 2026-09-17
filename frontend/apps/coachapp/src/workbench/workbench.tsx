import {useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useConversationUpdates} from '../api/conversation-updates';
import {useWorkbenchFollowUps, useWorkbenchItems, type WorkbenchView} from '../api/workbench';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, Surface} from '../ui/page';
import {SnoozeClient, type SnoozeTarget} from './snooze-client';
import {WorkbenchTaskRow} from './workbench-task';

export function Workbench() {
  const [params, setParams] = useSearchParams();
  const view: WorkbenchView = params.get('view') === 'follow-ups' ? 'follow-ups' : 'awaiting';
  const search = params.get('search')?.trim() ?? '';
  const tasks = useWorkbenchItems({view, search});
  const followUps = useWorkbenchFollowUps();
  const [snooze, setSnooze] = useState<SnoozeTarget | null>(null);
  const [notice, setNotice] = useState('');
  useConversationUpdates();

  function selectView(next: WorkbenchView) {
    setNotice('');
    setParams({view: next}, {replace: true});
  }

  return (
    <Page>
      <PageHeader
        title="Workbench"
        description="See who needs your attention."
      />
      <section
        aria-label="Choose work"
        className="space-y-4"
      >
        <nav
          aria-label="Workbench views"
          className="flex gap-2 border-b border-border pb-3"
        >
          <Button
            variant={view === 'awaiting' ? 'secondary' : 'ghost'}
            aria-current={view === 'awaiting' ? 'page' : false}
            onPress={() => selectView('awaiting')}
          >
            Awaiting you
          </Button>
          <Button
            variant={view === 'follow-ups' ? 'secondary' : 'ghost'}
            aria-current={view === 'follow-ups' ? 'page' : false}
            onPress={() => selectView('follow-ups')}
          >
            Follow-ups{' '}
            <span className="tabular-nums text-muted-foreground">
              · {followUps.isError ? '—' : (followUps.data?.count ?? '—')}
            </span>
          </Button>
        </nav>
        {followUps.isError && (
          <div className="flex flex-wrap items-center gap-2">
            <FormError message="Follow-up count unavailable. Your work is still accessible." />
            <Button
              variant="ghost"
              size="sm"
              isPending={followUps.isFetching}
              onPress={() => {
                followUps.refresh();
              }}
            >
              Retry count
            </Button>
          </div>
        )}
        <div className="space-y-2">
          <h2 className="section-title">{view === 'awaiting' ? 'Needs attention' : 'Follow-ups'}</h2>
          {view === 'awaiting' ? (
            <details className="text-sm text-muted-foreground">
              <summary className="w-fit cursor-pointer rounded-sm underline-offset-4 hover:underline">
                How work is ordered
              </summary>
              <p className="max-w-2xl pt-2 leading-relaxed">
                Missing plans come first, then replies and reviews by waiting time, then upcoming plan gaps.
              </p>
            </details>
          ) : (
            <p className="text-sm text-muted-foreground">
              Invitations, overdue forms and engagements to follow up on, earliest dates first.
            </p>
          )}
        </div>
        <ListSearch label="Search clients" />
      </section>
      {notice && <p role="status">{notice}</p>}
      <InfiniteList
        query={tasks}
        label="tasks"
        singular="task"
        empty={
          <Surface className="space-y-3 py-10">
            <h3 className="section-title">
              {search
                ? 'No matching work'
                : view === 'awaiting'
                  ? 'No replies, reviews, or plans waiting on you.'
                  : 'No follow-ups in this view.'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {search
                ? 'Try another client name or clear your search.'
                : view === 'awaiting'
                  ? 'You can check Follow-ups or return later for client updates.'
                  : 'Individual client pages still show their full request history.'}
            </p>
          </Surface>
        }
      >
        {(task) => (
          <WorkbenchTaskRow
            task={task}
            onSnooze={(target) => {
              setNotice('');
              setSnooze(target);
            }}
          />
        )}
      </InfiniteList>
      {snooze && (
        <SnoozeClient
          target={snooze}
          onClose={() => setSnooze(null)}
          onSaved={(message) => {
            setNotice(message);
            setSnooze(null);
          }}
        />
      )}
    </Page>
  );
}
