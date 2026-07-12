/**
 * Home-screen nudge for the auto-assigned intake form. Renders nothing once
 * the client has no open ('assigned' | 'in_progress') intake assignment —
 * disappears via the FormAssignment cache tag invalidated on submit (see
 * @/api/checkins).
 */
import {ClipboardCheck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {useListClientFormAssignmentsQuery} from '@/api/checkins';

export default function IntakeCard() {
  const navigate = useNavigate();
  const {data} = useListClientFormAssignmentsQuery();

  const intake = data?.data.find(
    (a) => a.purpose === 'intake' && (a.status === 'assigned' || a.status === 'in_progress'),
  );

  if (!intake) {
    return null;
  }

  return (
    <div className="mb-3.5 rounded-[20px] border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck
          className="text-accent"
          size={18}
        />
        <p className="text-sm font-semibold">Tell your coach about yourself</p>
      </div>
      <p className="mt-1 text-xs text-muted">Your coach needs your intake answers to build your first plan.</p>
      <button
        className="mt-3.5 flex min-h-11 w-full items-center justify-center rounded-xl bg-accent py-3 font-bold text-accent-foreground transition-opacity active:opacity-90"
        onClick={() => navigate(ROUTES.CHECKIN_FILL.replace(':id', intake.id))}
        type="button"
      >
        Fill intake form
      </button>
    </div>
  );
}
