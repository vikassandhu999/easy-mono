/**
 * Client detail "Check-ins" section: the client's assigned check-ins with
 * status, plus an inline responses view (the coach submissions endpoint) and an
 * assign control.
 */
import {formatIsoDateOnly} from '@easy/utils';
import {Chip, Spinner, Typography} from '@heroui/react';
import {ChevronDown, ChevronUp} from 'lucide-react';
import {useState} from 'react';
import SectionHeading from '@/@components/section-heading';

import {
  ASSIGNMENT_STATUS_LABELS,
  type ClientProfileFormAssignment,
  useListClientFormAssignmentsForCoachQuery,
  useListFormSubmissionsQuery,
} from '@/api/checkins';
import CheckinAssignControl from '@/clients/components/checkin-assign-control';

const STATUS_COLOR: Record<string, 'accent' | 'default' | 'success' | 'warning'> = {
  assigned: 'default',
  completed: 'success',
  dismissed: 'default',
  in_progress: 'warning',
};

function formatAnswer(value: unknown): string {
  if (value == null || value === '') {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '—';
  }
  return String(value);
}

type SnapshotQuestion = {id?: string; label?: string};
type SnapshotSection = {questions?: SnapshotQuestion[]; title?: string};

function CheckinResponses({assignmentId}: {assignmentId: string}) {
  const {data, isLoading} = useListFormSubmissionsQuery({id: assignmentId});
  const submission = data?.data?.[0];

  if (isLoading) {
    return (
      <div className="flex justify-center py-3">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!submission) {
    return (
      <Typography
        className="py-2"
        color="muted"
        type="body-xs"
      >
        No response yet.
      </Typography>
    );
  }

  const sections = (submission.question_snapshot ?? []) as SnapshotSection[];
  const answers = submission.answers as Record<string, unknown>;

  return (
    <div className="flex flex-col gap-2 pt-1">
      {sections.flatMap((section, si) =>
        (section.questions ?? []).map((q, qi) => (
          <div key={`${si}-${q.id ?? qi}`}>
            <Typography
              color="muted"
              type="body-xs"
            >
              {q.label ?? q.id}
            </Typography>
            <Typography
              className="break-words"
              type="body-sm"
            >
              {formatAnswer(q.id ? answers[q.id] : undefined)}
            </Typography>
          </div>
        )),
      )}
      <Typography
        className="pt-1"
        color="muted"
        type="body-xs"
      >
        Submitted {formatIsoDateOnly(submission.submitted_at)}
      </Typography>
    </div>
  );
}

function AssignmentRow({assignment}: {assignment: ClientProfileFormAssignment}) {
  const [open, setOpen] = useState(false);
  const name = assignment.form_template?.name ?? 'Check-in';
  const due = assignment.due_date ? `Due ${formatIsoDateOnly(assignment.due_date)}` : null;

  return (
    <div className="rounded-xl bg-surface-secondary">
      <button
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-surface-hover"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <div className="min-w-0 flex-1">
          <Typography
            truncate
            type="body-sm"
            weight="semibold"
          >
            {name}
          </Typography>
          {due ? (
            <Typography
              color="muted"
              type="body-xs"
            >
              {due}
            </Typography>
          ) : null}
        </div>
        <Chip
          color={STATUS_COLOR[assignment.status] ?? 'default'}
          size="sm"
          variant="soft"
        >
          {ASSIGNMENT_STATUS_LABELS[assignment.status] ?? assignment.status}
        </Chip>
        {open ? (
          <ChevronUp
            className="shrink-0 text-muted"
            size={15}
          />
        ) : (
          <ChevronDown
            className="shrink-0 text-muted"
            size={15}
          />
        )}
      </button>
      {open ? (
        <div className="border-t border-border px-3 pb-3">
          <CheckinResponses assignmentId={assignment.id} />
        </div>
      ) : null}
    </div>
  );
}

export default function ClientCheckins({clientId, clientName}: {clientId: string; clientName: string}) {
  const {data, isLoading} = useListClientFormAssignmentsForCoachQuery({clientId});
  const assignments = data?.data ?? [];

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <SectionHeading title="Check-ins" />

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : assignments.length === 0 ? (
        <Typography
          color="muted"
          type="body-sm"
        >
          No check-ins assigned yet
        </Typography>
      ) : (
        <div className="flex flex-col gap-2">
          {assignments.map((assignment) => (
            <AssignmentRow
              assignment={assignment}
              key={assignment.id}
            />
          ))}
        </div>
      )}

      <div className="mt-2">
        <CheckinAssignControl
          clientId={clientId}
          clientName={clientName}
        />
      </div>
    </div>
  );
}
