import {useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {useConversationUpdates} from '../api/conversation-updates';
import {useWorkbench, useWorkbenchQueue, type WorkbenchQueue} from '../api/workbench';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {InfiniteList} from '../ui/infinite-list';
import {Label} from '../ui/label';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {SnoozeClient, type SnoozeTarget} from './snooze-client';
import {WorkbenchTaskRow} from './workbench-task';

const queues = [
  {
    id: 'check-ins',
    title: 'Check-in reviews',
    description: 'Read submitted updates and decide what your client needs next.',
  },
  {id: 'replies', title: 'Replies', description: 'Respond to clients who are waiting to hear from you.'},
  {id: 'onboarding', title: 'Getting started', description: 'Follow up on invitations and overdue intake forms.'},
  {id: 'programming', title: 'Plans', description: 'Prepare missing plans and keep upcoming days covered.'},
  {id: 'expiring', title: 'Ending soon', description: 'Review coaching engagements before access expires.'},
  {id: 'quiet', title: 'Missed check-ins', description: 'Reach out when a client has missed their latest check-in.'},
] satisfies Array<{id: WorkbenchQueue; title: string; description: string}>;

function readQueue(value: string | null): WorkbenchQueue {
  switch (value) {
    case 'replies':
    case 'onboarding':
    case 'programming':
    case 'expiring':
    case 'quiet':
      return value;
    default:
      return 'check-ins';
  }
}

export function Workbench() {
  const [params, setParams] = useSearchParams();
  const queue = readQueue(params.get('queue'));
  const search = params.get('search')?.trim() ?? '';
  const serviceValue = params.get('service');
  const service = serviceValue === 'training' || serviceValue === 'nutrition' ? serviceValue : 'all';
  const summary = useWorkbench();
  const tasks = useWorkbenchQueue(queue, {search, ...(queue === 'programming' ? {service} : {})});
  const [snooze, setSnooze] = useState<SnoozeTarget | null>(null);
  const [notice, setNotice] = useState('');
  useConversationUpdates();
  function countFor(id: WorkbenchQueue) {
    const counts = summary.data?.data;
    return !counts
      ? null
      : id === 'programming'
        ? counts.programming.all
        : id === 'check-ins'
          ? counts.check_ins
          : counts[id];
  }
  function selectQueue(value: WorkbenchQueue) {
    setNotice('');
    setParams({queue: value}, {replace: true});
  }
  return (
    <Page>
      <PageHeader
        title="Workbench"
        description="Client updates, plans and follow-ups."
        actions={
          <Button
            variant="outline"
            isPending={summary.isFetching}
            onPress={() => {
              summary.refresh();
            }}
          >
            Refresh workbench
          </Button>
        }
      />
      {summary.isError && (
        <FormError
          message={errorMessage(summary.error, 'Could not refresh task counts. You can still open a queue.')}
        />
      )}
      <div className="grid gap-2 sm:hidden">
        <Label
          id="workbench-queue-label"
          htmlFor="workbench-queue"
        >
          Task queue
        </Label>
        <SelectField
          id="workbench-queue"
          value={queue}
          onChange={(value) => selectQueue(readQueue(value))}
        >
          {queues.map((entry) => (
            <SelectItem
              key={entry.id}
              id={entry.id}
            >
              {entry.title} · {countFor(entry.id) ?? '—'}
            </SelectItem>
          ))}
        </SelectField>
      </div>
      <nav
        aria-label="Workbench queues"
        className="hidden gap-2 sm:grid sm:grid-cols-3 lg:grid-cols-6"
      >
        {queues.map((entry) => {
          const count = countFor(entry.id);
          return (
            <Button
              key={entry.id}
              variant={queue === entry.id ? 'secondary' : 'ghost'}
              aria-current={queue === entry.id ? 'page' : false}
              className="h-auto min-h-16 flex-col items-start gap-1 whitespace-normal px-4 py-3 text-left"
              onPress={() => selectQueue(entry.id)}
            >
              <span>{entry.title}</span>
              <span className="text-xl tabular-nums">{count ?? '—'}</span>
            </Button>
          );
        })}
      </nav>
      {queues.map(
        (entry) =>
          entry.id === queue && (
            <div
              key={entry.id}
              className="space-y-2"
            >
              <h2 className="text-xl font-semibold">{entry.title}</h2>
              <p className="text-sm text-muted-foreground">{entry.description}</p>
            </div>
          ),
      )}
      <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <ListSearch label="Search tasks" />
        {queue === 'programming' && (
          <div className="grid gap-2">
            <Label
              id="workbench-service-label"
              htmlFor="workbench-service"
            >
              Service
            </Label>
            <SelectField
              id="workbench-service"
              value={service}
              onChange={(value) => {
                setParams(
                  (previous) => {
                    const next = new URLSearchParams(previous);
                    next.set('service', value);
                    return next;
                  },
                  {replace: true},
                );
              }}
            >
              <SelectItem id="all">All services</SelectItem>
              <SelectItem id="training">Training</SelectItem>
              <SelectItem id="nutrition">Nutrition</SelectItem>
            </SelectField>
          </div>
        )}
      </div>
      {notice && <p role="status">{notice}</p>}
      <InfiniteList
        query={tasks}
        label="tasks"
        singular="task"
        empty={
          <Surface className="space-y-3 py-10">
            <h3 className="section-title">{search ? 'No matching tasks' : 'Nothing waiting in this queue'}</h3>
            <p className="text-sm text-muted-foreground">
              {search
                ? 'Try another client name or clear your search.'
                : 'You can choose another queue or return later for updates.'}
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
