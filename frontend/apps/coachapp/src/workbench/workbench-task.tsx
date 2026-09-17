import {formatDateLong, formatIsoDate} from '@easy/utils';
import {generatePath, Link, useLocation} from 'react-router-dom';
import type {WorkbenchTask} from '../api/workbench';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import type {SnoozeTarget} from './snooze-client';

function taskAction(task: WorkbenchTask) {
  const id = task.client.id;
  switch (task.kind) {
    case 'reply':
      return {to: generatePath(routes.clientConversation, {clientId: id}), label: 'Reply'};
    case 'review':
      return task.target.purpose === 'intake'
        ? {to: generatePath(routes.client, {id}), label: 'Review intake'}
        : {to: generatePath(routes.checkInResponse, {id: task.target.submission_id}), label: 'Review check-in'};
    case 'prepare_plan':
      return task.target.service === 'training'
        ? {to: generatePath(routes.assignTrainingPlan, {id}), label: 'Prepare training plan'}
        : {to: generatePath(routes.assignNutritionPlan, {id}), label: 'Prepare nutrition plan'};
    case 'invitation_follow_up':
      return {to: generatePath(routes.client, {id}), label: 'Follow up invitation'};
    case 'intake_follow_up':
      return {to: generatePath(routes.client, {id}), label: 'Follow up intake'};
    case 'missed_check_in':
      return {to: generatePath(routes.clientConversation, {clientId: id}), label: 'Follow up'};
    case 'ending_engagement':
      return {to: generatePath(routes.clientProfile, {id}), label: 'Update engagement'};
  }
}

function taskReason(reason: WorkbenchTask['reasons'][number], dueOn: string | null) {
  switch (reason.code) {
    case 'reply_needed':
      return (
        <>
          Waiting for a reply · <time dateTime={reason.waiting_since}>{formatIsoDate(reason.waiting_since)}</time>
        </>
      );
    case 'intake_awaiting_review':
    case 'check_in_awaiting_review':
      return (
        <>
          {reason.code === 'intake_awaiting_review' ? 'Intake' : 'Check-in'} submitted ·{' '}
          <time dateTime={reason.submitted_at}>{formatIsoDate(reason.submitted_at)}</time>
        </>
      );
    case 'service_never_programmed':
      return (
        <>
          {reason.service === 'training' ? 'Training' : 'Nutrition'} · No plan assigned yet
          {dueOn && (
            <>
              {' '}
              · Coverage needed from <time dateTime={dueOn}>{formatDateLong(dueOn)}</time>
            </>
          )}
        </>
      );
    case 'service_coverage_missing':
      return (
        <>
          {reason.service === 'training' ? 'Training' : 'Nutrition'} coverage missing from{' '}
          <time dateTime={reason.first_uncovered_on}>{formatDateLong(reason.first_uncovered_on)}</time>
        </>
      );
    case 'service_coverage_ending_soon':
      return (
        <>
          {reason.service === 'training' ? 'Training' : 'Nutrition'} coverage ends{' '}
          <time dateTime={reason.coverage_ends_on}>{formatDateLong(reason.coverage_ends_on)}</time>
        </>
      );
    case 'invitation_follow_up_due':
      return (
        <>
          Invitation follow-up due{' '}
          <time dateTime={reason.follow_up_due_at}>{formatIsoDate(reason.follow_up_due_at)}</time>
        </>
      );
    case 'intake_overdue':
      return (
        <>
          Intake overdue · <time dateTime={reason.due_on}>{formatDateLong(reason.due_on)}</time>
        </>
      );
    case 'missed_check_in':
      return (
        <>
          Missed check-in due <time dateTime={reason.due_on}>{formatDateLong(reason.due_on)}</time>
        </>
      );
    case 'engagement_ending_soon':
      return (
        <>
          Engagement ends <time dateTime={reason.ends_on}>{formatDateLong(reason.ends_on)}</time>
        </>
      );
  }
}

export function WorkbenchTaskRow({task, onSnooze}: {task: WorkbenchTask; onSnooze: (target: SnoozeTarget) => void}) {
  const location = useLocation();
  const state = {returnTo: `${routes.workbench}${location.search}`, returnLabel: 'Back to workbench'};
  const name = `${task.client.first_name ?? ''} ${task.client.last_name ?? ''}`.trim() || task.client.email || 'Client';
  const action = taskAction(task);
  const queue = task.kind === 'missed_check_in' ? 'quiet' : task.kind === 'ending_engagement' ? 'expiring' : null;
  return (
    <article
      aria-label={`${name} · ${action.label}`}
      data-workbench-id={task.id}
      className="grid min-w-0 gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
    >
      <div className="min-w-0 space-y-1.5 wrap-anywhere">
        <Link
          to={generatePath(routes.client, {id: task.client.id})}
          state={state}
          className="text-base font-semibold underline-offset-4 hover:underline"
        >
          {name}
        </Link>
        <div className="space-y-1 text-sm leading-relaxed text-muted-foreground">
          {task.reasons.map((reason) => (
            <p key={reason.code}>{taskReason(reason, task.due_on)}</p>
          ))}
          {task.preview && <p>{task.preview}</p>}
          {task.kind === 'reply' && !task.preview && <p>Client message · Open the conversation to see it.</p>}
          {task.client.status !== 'active' && (
            <p>{task.client.status === 'pending' ? 'Invitation pending' : 'Client inactive'}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={action.to}
          state={state}
          className={buttonVariants({variant: 'outline', size: 'sm'})}
        >
          {action.label}
        </Link>
        {queue && (
          <Button
            variant="ghost"
            size="sm"
            onPress={() => onSnooze({clientId: task.client.id, name, queue})}
          >
            Snooze
          </Button>
        )}
      </div>
    </article>
  );
}
