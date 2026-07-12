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
    <div className="mb-3.5 rounded-3xl bg-[var(--ink-card)] p-[22px] text-white shadow-[0_22px_48px_-24px_rgba(0,0,0,0.65)]">
      <div className="flex items-center gap-2">
        {overdue ? (
          <AlertCircle
            className="text-accent"
            size={18}
          />
        ) : (
          <ClipboardCheck
            className="text-accent"
            size={18}
          />
        )}
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/50">
          {status} · {checkIn.form_template?.name ?? 'Coach check-in'}
        </p>
      </div>
      <p className="mt-3 text-[23px] font-extrabold leading-[1.1] tracking-[-0.02em]">How&apos;s the week going?</p>
      <p className="mt-2 text-[13px] leading-[1.45] text-white/60">
        {overdue ? 'Your coach is waiting for your update.' : 'Take a moment to share how things are going.'}
      </p>
      <button
        className="mt-[18px] flex min-h-[52px] w-full items-center justify-center rounded-[15px] bg-white py-3.5 font-extrabold text-[var(--ink-card)]"
        onClick={() => navigate(ROUTES.CHECKIN_FILL.replace(':id', checkIn.id))}
        type="button"
      >
        Start check-in
      </button>
    </div>
  );
}
