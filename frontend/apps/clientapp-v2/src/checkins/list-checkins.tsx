import {formatIsoDateOnly} from '@easy/utils';
import {Spinner} from '@heroui/react';
import {ChevronRight, ClipboardCheck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {
  type AssignmentDisplayStatus,
  assignmentDisplayStatus,
  type ClientProfileFormAssignment,
  PURPOSE_LABELS,
  useListClientFormAssignmentsQuery,
} from '@/api/checkins';

function statusClass(status: AssignmentDisplayStatus): string {
  if (status.startsWith('Completed')) {
    return 'bg-[#eaf7f0] text-success-secondary';
  }
  if (status === 'Overdue' || status === 'Missed') {
    return 'bg-danger/10 text-danger';
  }
  if (status === 'Due today') {
    return 'bg-[#faf3e6] text-warning';
  }
  return 'bg-surface-secondary text-muted';
}

function AssignmentRow({assignment, onOpen}: {assignment: ClientProfileFormAssignment; onOpen: () => void}) {
  const status = assignmentDisplayStatus(assignment);
  const missed = assignment.status === 'missed';
  const due = assignment.due_date ? `Due ${formatIsoDateOnly(assignment.due_date)}` : null;
  return (
    <button
      className={`flex min-h-[62px] w-full items-center gap-3 border-t border-separator px-3.5 py-3 text-left first:border-t-0 ${missed ? 'cursor-default opacity-70' : ''}`}
      disabled={missed}
      onClick={onOpen}
      type="button"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
        <ClipboardCheck size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-sm">{assignment.form_template?.name ?? 'Check-in'}</b>
        <span className="text-[11px] text-muted">
          {PURPOSE_LABELS[assignment.purpose] ?? 'Form'}
          {due ? ` · ${due}` : ''}
        </span>
      </span>
      <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-extrabold ${statusClass(status)}`}>
        {status}
      </span>
      {!missed ? (
        <ChevronRight
          className="shrink-0 text-muted"
          size={15}
        />
      ) : null}
    </button>
  );
}

export default function ListCheckins() {
  const navigate = useNavigate();
  const {data, isLoading} = useListClientFormAssignmentsQuery();
  const assignments = data?.data ?? [];
  const pending = assignments.filter(
    (assignment) => assignment.status === 'assigned' || assignment.status === 'in_progress',
  );
  const history = assignments.filter((assignment) => !pending.includes(assignment));
  const open = (assignment: ClientProfileFormAssignment) => navigate(ROUTES.CHECKIN_FILL.replace(':id', assignment.id));

  return (
    <PageLayout
      description="Forms and check-ins from your coach"
      title="Check-ins"
    >
      {isLoading ? (
        <div className="grid min-h-56 place-items-center">
          <Spinner />
        </div>
      ) : assignments.length === 0 ? (
        <div className="rounded-[20px] border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
            <ClipboardCheck size={24} />
          </div>
          <h3 className="font-extrabold">No check-ins yet</h3>
          <p className="mt-2 text-sm text-muted">Your coach hasn&apos;t sent you any check-ins.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 ? (
            <section className="mb-[22px]">
              <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">To do</p>
              <div className="overflow-hidden rounded-[20px] border border-border bg-surface">
                {pending.map((assignment) => (
                  <AssignmentRow
                    assignment={assignment}
                    key={assignment.id}
                    onOpen={() => open(assignment)}
                  />
                ))}
              </div>
            </section>
          ) : null}
          <section>
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">History</p>
            {history.length > 0 ? (
              <div className="overflow-hidden rounded-[20px] border border-border bg-surface">
                {history.map((assignment) => (
                  <AssignmentRow
                    assignment={assignment}
                    key={assignment.id}
                    onOpen={() => open(assignment)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-surface p-5 text-center text-sm text-muted">
                Completed check-ins will appear here.
              </div>
            )}
          </section>
        </>
      )}
    </PageLayout>
  );
}
