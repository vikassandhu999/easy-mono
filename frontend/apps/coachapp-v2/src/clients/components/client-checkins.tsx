/**
 * Client detail "Client check-in" card. Shows the next assigned check-in and
 * the latest client submission, rendered from the stored question snapshot.
 */
import {formatIsoDateOnly} from '@easy/utils';
import {Skeleton, Typography} from '@heroui/react';
import {CalendarCheck} from 'lucide-react';

import {
  ASSIGNMENT_STATUS_LABELS,
  type ClientProfileFormAssignment,
  useListClientFormAssignmentsForCoachQuery,
  useListFormSubmissionsQuery,
} from '@/api/checkins';
import CheckinAssignControl from '@/clients/components/checkin-assign-control';
import CheckinAssignmentActions from '@/clients/components/checkin-assignment-actions';

type SnapshotQuestion = {id?: string; label?: string};
type SnapshotSection = {questions?: SnapshotQuestion[]; title?: string};

function formatAnswer(value: unknown): string {
  if (value == null || value === '') {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(String).join(', ') : '—';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function selectNextDue(assignments: ClientProfileFormAssignment[]): ClientProfileFormAssignment | null {
  const upcoming = assignments.filter((assignment) => !['completed', 'dismissed'].includes(assignment.status));
  return upcoming.sort((a, b) => (a.due_date ?? '9999-12-31').localeCompare(b.due_date ?? '9999-12-31'))[0] ?? null;
}

function selectLatestCompleted(assignments: ClientProfileFormAssignment[]): ClientProfileFormAssignment | null {
  return (
    assignments
      .filter((assignment) => assignment.completed_at || assignment.status === 'completed')
      .sort((a, b) => (b.completed_at ?? b.updated_at).localeCompare(a.completed_at ?? a.updated_at))[0] ?? null
  );
}

function statusClass(status: ClientProfileFormAssignment['status']): string {
  if (status === 'completed') {
    return 'bg-success-soft text-success-soft-foreground';
  }
  if (status === 'in_progress') {
    return 'bg-warning-soft text-warning-soft-foreground';
  }
  return 'bg-default-soft text-default-soft-foreground';
}

function SubmissionAnswers({assignment}: {assignment: ClientProfileFormAssignment | null}) {
  const {data, isLoading} = useListFormSubmissionsQuery({id: assignment?.id ?? ''}, {skip: !assignment});
  const submission = data?.data?.[0] ?? null;

  if (!assignment) {
    return (
      <Typography
        color="muted"
        type="body-sm"
      >
        No completed check-ins yet.
      </Typography>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-32 rounded-3xl" />;
  }

  if (!submission) {
    return (
      <Typography
        color="muted"
        type="body-sm"
      >
        No response yet.
      </Typography>
    );
  }

  const sections = (submission.question_snapshot ?? []) as SnapshotSection[];
  const answers = submission.answers as Record<string, unknown>;
  const questions = sections.flatMap((section) =>
    (section.questions ?? []).map((question) => ({
      id: `${section.title ?? 'section'}-${question.id ?? question.label ?? 'question'}`,
      label: question.label ?? question.id ?? 'Question',
      value: question.id ? answers[question.id] : undefined,
    })),
  );

  return (
    <div>
      <Typography
        className="mb-3"
        color="muted"
        type="body-xs"
        weight="bold"
      >
        Submitted {formatIsoDateOnly(submission.submitted_at)}
      </Typography>
      {questions.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {questions.map((question) => (
            <div
              className="rounded-3xl border-[1.5px] border-separator bg-surface p-4"
              key={question.id}
            >
              <Typography
                color="muted"
                type="body-xs"
                weight="semibold"
              >
                {question.label}
              </Typography>
              <Typography
                className="mt-1 break-words font-grotesk text-xl font-bold"
                type="body-sm"
              >
                {formatAnswer(question.value)}
              </Typography>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border-[1.5px] border-separator bg-surface p-4">
          <Typography
            className="break-words"
            type="body-sm"
          >
            {formatAnswer(answers)}
          </Typography>
        </div>
      )}
    </div>
  );
}

export default function ClientCheckins({clientId, clientName}: {clientId: string; clientName: string}) {
  const {data, isError, isLoading} = useListClientFormAssignmentsForCoachQuery({clientId});
  const assignments = data?.data ?? [];
  const nextDue = selectNextDue(assignments);
  const latestCompleted = selectLatestCompleted(assignments);

  return (
    <section className="rounded-3xl border-[1.5px] border-separator bg-surface p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-grotesk text-xl font-bold">Client check-in</h2>
          <Typography
            className="mt-1"
            color="muted"
            type="body-sm"
          >
            {nextDue?.form_template?.name ?? 'Assigned check-ins'}
          </Typography>
        </div>
        {nextDue ? (
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(nextDue.status)}`}>
            {ASSIGNMENT_STATUS_LABELS[nextDue.status] ?? nextDue.status}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
      ) : isError ? (
        <Typography
          color="muted"
          type="body-sm"
        >
          Couldn&apos;t load check-ins.
        </Typography>
      ) : assignments.length === 0 ? (
        <Typography
          color="muted"
          type="body-sm"
        >
          No check-ins assigned yet.
        </Typography>
      ) : (
        <>
          {nextDue ? (
            <div className="mb-5 rounded-3xl border border-accent/30 bg-accent-soft p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
                  <CalendarCheck size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <Typography
                    type="body-sm"
                    weight="bold"
                  >
                    Next check-in due
                  </Typography>
                  <Typography
                    className="mt-0.5 text-accent"
                    type="body-xs"
                    weight="semibold"
                  >
                    {nextDue.due_date ? formatIsoDateOnly(nextDue.due_date) : 'No due date set'}
                  </Typography>
                </div>
              </div>
              <CheckinAssignmentActions assignment={nextDue} />
            </div>
          ) : null}

          <Typography
            className="mb-3 uppercase tracking-wider"
            color="muted"
            type="body-xs"
            weight="bold"
          >
            Latest submission
          </Typography>
          <SubmissionAnswers assignment={latestCompleted} />
        </>
      )}

      <div className="mt-4">
        <CheckinAssignControl
          clientId={clientId}
          clientName={clientName}
        />
      </div>
    </section>
  );
}
