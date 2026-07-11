/**
 * Client detail "Client check-in" card. Shows the next assigned check-in and
 * the latest client submission, rendered from the stored question snapshot.
 */
import {formatIsoDateOnly} from '@easy/utils';
import {Button, Skeleton, Typography, toast} from '@heroui/react';
import {CalendarCheck} from 'lucide-react';

import {
  ASSIGNMENT_STATUS_LABELS,
  type ClientProfileCheckInSchedule,
  type ClientProfileFormAssignment,
  useListCheckInSchedulesForClientQuery,
  useListClientFormAssignmentsForCoachQuery,
  useListFormSubmissionsQuery,
  useUpdateCheckInScheduleMutation,
} from '@/api/checkins';
import CheckinAssignControl from '@/clients/components/checkin-assign-control';
import CheckinAssignmentActions from '@/clients/components/checkin-assignment-actions';
import CheckinTrends from '@/clients/components/checkin-trends';

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
  const upcoming = assignments.filter(
    (assignment) => !['completed', 'dismissed', 'missed'].includes(assignment.status),
  );
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
  if (status === 'missed') {
    return 'bg-danger-soft text-danger-soft-foreground';
  }
  return 'bg-default-soft text-default-soft-foreground';
}

const FREQUENCY_LABELS: Record<ClientProfileCheckInSchedule['frequency'], string> = {
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  once: 'Once',
  weekly: 'Weekly',
};

function ScheduleRows({schedules}: {schedules: ClientProfileCheckInSchedule[]}) {
  const [updateSchedule, {isLoading}] = useUpdateCheckInScheduleMutation();

  const toggleSchedule = async (schedule: ClientProfileCheckInSchedule) => {
    try {
      await updateSchedule({
        id: schedule.id,
        clientProfileCheckInScheduleUpdateRequest: {active: !schedule.active},
      }).unwrap();
      toast.success(schedule.active ? 'Schedule paused' : 'Schedule resumed');
    } catch {
      toast.danger("Schedule wasn't updated. Try again.");
    }
  };

  if (schedules.length === 0) {
    return null;
  }

  return (
    <div className="mb-5 space-y-2">
      <Typography
        className="uppercase tracking-wider"
        color="muted"
        type="body-xs"
        weight="bold"
      >
        Cadence
      </Typography>
      {schedules.map((schedule) => (
        <div
          className="flex min-h-11 items-center gap-3 rounded-[12px] border border-border bg-surface p-3"
          key={schedule.id}
        >
          <div className="min-w-0 flex-1">
            <Typography
              truncate
              type="body-sm"
              weight="semibold"
            >
              {schedule.form_template.name}
            </Typography>
            <Typography
              color="muted"
              type="body-xs"
            >
              {FREQUENCY_LABELS[schedule.frequency]} · next {formatIsoDateOnly(schedule.next_due_on)}
            </Typography>
          </div>
          <Button
            isDisabled={isLoading || (schedule.frequency === 'once' && !schedule.active)}
            onPress={() => toggleSchedule(schedule)}
            size="sm"
            variant="ghost"
          >
            {schedule.active ? 'Pause' : 'Resume'}
          </Button>
        </div>
      ))}
    </div>
  );
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
    return <Skeleton className="h-32 rounded-[16px]" />;
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
              className="rounded-[14px] border-[1.5px] border-separator bg-surface p-4"
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
        <div className="rounded-[14px] border-[1.5px] border-separator bg-surface p-4">
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
  const {data: schedulesData, isLoading: schedulesLoading} = useListCheckInSchedulesForClientQuery({clientId});
  const assignments = data?.data ?? [];
  const nextDue = selectNextDue(assignments);
  const latestCompleted = selectLatestCompleted(assignments);
  const schedules = schedulesData?.data ?? [];
  const history = [...assignments].sort((a, b) => b.inserted_at.localeCompare(a.inserted_at)).slice(0, 6);

  return (
    <section>
      <div className="mb-5 hidden flex-col gap-3 lg:flex lg:flex-row lg:items-start lg:justify-between">
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

      {isLoading || schedulesLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-[16px]" />
          <Skeleton className="h-40 rounded-[16px]" />
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
          <ScheduleRows schedules={schedules} />
          {nextDue ? (
            <div className="mb-4 rounded-[14px] border border-accent/30 bg-accent-soft p-4 lg:mb-5 lg:rounded-[16px]">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
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

          {history.length > 0 ? (
            <div className="mb-5">
              <Typography
                className="mb-2 uppercase tracking-wider"
                color="muted"
                type="body-xs"
                weight="bold"
              >
                Occurrence history
              </Typography>
              <div className="flex flex-wrap gap-2">
                {history.map((assignment) => (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(assignment.status)}`}
                    key={assignment.id}
                  >
                    {assignment.status === 'assigned' || assignment.status === 'in_progress'
                      ? 'Due'
                      : (ASSIGNMENT_STATUS_LABELS[assignment.status] ?? assignment.status)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <CheckinTrends assignments={assignments} />

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
