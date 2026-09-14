import {formatDateLong, formatIsoDate} from '@easy/utils';
import type {ReactNode} from 'react';
import {generatePath, Link, useLocation} from 'react-router-dom';
import type {WorkbenchTask} from '../api/workbench';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import type {SnoozeTarget} from './snooze-client';

export function WorkbenchTaskRow({task, onSnooze}: {task: WorkbenchTask; onSnooze: (target: SnoozeTarget) => void}) {
  const location = useLocation();
  const state = {returnTo: `${routes.workbench}${location.search}`, returnLabel: 'Back to workbench'};
  const clientId = task.kind === 'replies' ? task.item.conversation.client_id : task.item.client.id;
  const name =
    task.kind === 'replies'
      ? task.item.conversation.client_name || 'Client'
      : `${task.item.client.first_name ?? ''} ${task.item.client.last_name ?? ''}`.trim() ||
        task.item.client.email ||
        'Client';
  const link = (to: string, label: string) => (
    <Link
      to={to}
      state={state}
      className={buttonVariants({variant: 'outline', size: 'sm'})}
    >
      {label}
    </Link>
  );
  let reasons: ReactNode;
  let actions: ReactNode;
  switch (task.kind) {
    case 'check-ins':
      reasons = (
        <p>
          Submitted{' '}
          <time dateTime={task.item.submission.submitted_at}>{formatIsoDate(task.item.submission.submitted_at)}</time> ·
          Awaiting review
        </p>
      );
      actions = link(generatePath(routes.checkInResponse, {id: task.item.submission.id}), 'Review check-in');
      break;
    case 'replies':
      reasons = (
        <>
          {task.item.reasons.map((reason) => (
            <p key={reason.code}>
              Waiting since <time dateTime={reason.waiting_since}>{formatIsoDate(reason.waiting_since)}</time>
            </p>
          ))}
          <p>
            {task.item.waiting_message_count} {task.item.waiting_message_count === 1 ? 'message' : 'messages'} waiting
          </p>
          {task.item.client_status !== 'active' && (
            <p>{task.item.client_status === 'pending' ? 'Invitation pending' : 'Client inactive'}</p>
          )}
        </>
      );
      actions = link(generatePath(routes.clientConversation, {clientId}), 'Reply');
      break;
    case 'onboarding':
      reasons = task.item.reasons.map((reason) => (
        <p key={reason.code}>
          {reason.code === 'invitation_follow_up_due' ? (
            <>
              Invitation sent <time dateTime={reason.sent_at}>{formatIsoDate(reason.sent_at)}</time> · Follow-up due
            </>
          ) : (
            <>
              {reason.form_title} · Intake due <time dateTime={reason.due_on}>{formatDateLong(reason.due_on)}</time>
            </>
          )}
        </p>
      ));
      actions = link(generatePath(routes.client, {id: clientId}), 'Follow up');
      break;
    case 'programming':
      reasons = task.item.reasons.map((reason) => (
        <div
          key={reason.service}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-1"
        >
          <p className="min-w-0 flex-1 basis-48">
            <span className="font-medium text-foreground">
              {reason.service === 'training' ? 'Training' : 'Nutrition'}
            </span>
            {' · '}
            {reason.code === 'service_never_programmed' ? (
              'No plan assigned yet'
            ) : reason.code === 'service_coverage_missing' ? (
              <>
                No coverage from{' '}
                <time dateTime={reason.first_uncovered_on}>{formatDateLong(reason.first_uncovered_on)}</time>
              </>
            ) : (
              <>
                Coverage ends <time dateTime={reason.coverage_ends_on}>{formatDateLong(reason.coverage_ends_on)}</time>{' '}
                · Next uncovered day{' '}
                <time dateTime={reason.first_uncovered_on}>{formatDateLong(reason.first_uncovered_on)}</time>
              </>
            )}
          </p>
          {link(
            generatePath(reason.service === 'training' ? routes.assignTrainingPlan : routes.assignNutritionPlan, {
              id: clientId,
            }),
            reason.service === 'training' ? 'Assign training' : 'Assign nutrition',
          )}
        </div>
      ));
      break;
    case 'expiring':
      reasons = task.item.reasons.map((reason) => (
        <p key={reason.code}>
          Engagement ends <time dateTime={reason.ends_on}>{formatDateLong(reason.ends_on)}</time>
        </p>
      ));
      actions = (
        <>
          {link(generatePath(routes.clientProfile, {id: clientId}), 'Update engagement')}
          <Button
            variant="ghost"
            size="sm"
            onPress={() => onSnooze({clientId, name, queue: 'expiring'})}
          >
            Snooze
          </Button>
        </>
      );
      break;
    case 'quiet':
      reasons = task.item.reasons.map((reason) => (
        <p key={reason.code}>
          Missed check-in due <time dateTime={reason.due_on}>{formatDateLong(reason.due_on)}</time>
        </p>
      ));
      actions = (
        <>
          {link(generatePath(routes.clientConversation, {clientId}), 'Message client')}
          <Button
            variant="ghost"
            size="sm"
            onPress={() => onSnooze({clientId, name, queue: 'quiet'})}
          >
            Snooze
          </Button>
        </>
      );
      break;
  }
  return (
    <article
      className="min-w-0 space-y-3 p-5 sm:p-6"
      aria-label={name}
    >
      <Link
        to={generatePath(routes.client, {id: clientId})}
        state={state}
        className="block break-words text-base font-semibold underline-offset-4 hover:underline"
      >
        {name}
      </Link>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{reasons}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </article>
  );
}
