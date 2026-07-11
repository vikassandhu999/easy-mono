import {AlertCircle, ClipboardCheck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {assignmentDisplayStatus, useListClientFormAssignmentsQuery} from '@/api/checkins';

export default function CheckinNudgeCard() {
  const navigate = useNavigate();
  const {data} = useListClientFormAssignmentsQuery();
  const assignments = data?.data ?? [];
  const hasOpenIntake = assignments.some(
    (assignment) =>
      assignment.purpose === 'intake' && (assignment.status === 'assigned' || assignment.status === 'in_progress'),
  );

  const checkIn = assignments
    .filter((assignment) => assignment.purpose === 'check_in')
    .filter((assignment) => ['Due today', 'Overdue'].includes(assignmentDisplayStatus(assignment)))
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))[0];

  if (hasOpenIntake || !checkIn) {
    return null;
  }

  const status = assignmentDisplayStatus(checkIn);
  const overdue = status === 'Overdue';

  return (
    <div
      className={`mb-3.5 rounded-2xl border p-4 ${overdue ? 'border-danger/30 bg-danger/10' : 'border-warning/30 bg-warning/10'}`}
    >
      <div className="flex items-center gap-2">
        {overdue ? (
          <AlertCircle
            className="text-danger"
            size={18}
          />
        ) : (
          <ClipboardCheck
            className="text-warning"
            size={18}
          />
        )}
        <p className="text-sm font-semibold">
          {status}: {checkIn.form_template?.name ?? 'Coach check-in'}
        </p>
      </div>
      <p className="mt-1 text-xs text-muted">
        {overdue ? 'Your coach is waiting for your update.' : 'Take a moment to share how things are going.'}
      </p>
      <button
        className="mt-3.5 flex min-h-11 w-full items-center justify-center rounded-xl bg-accent py-3 font-bold text-accent-foreground transition-opacity active:opacity-90"
        onClick={() => navigate(ROUTES.CHECKIN_FILL.replace(':id', checkIn.id))}
        type="button"
      >
        Complete check-in
      </button>
    </div>
  );
}
