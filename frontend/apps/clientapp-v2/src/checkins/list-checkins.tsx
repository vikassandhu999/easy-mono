import {formatIsoDateOnly} from '@easy/utils';
import {Spinner} from '@heroui/react';
import {ChevronRight, ClipboardCheck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {PURPOSE_LABELS, STATUS_LABELS, useListClientFormAssignmentsQuery} from '@/api/checkins';

export default function ListCheckins() {
  const navigate = useNavigate();
  const {data, isLoading} = useListClientFormAssignmentsQuery();
  const assignments = data?.data ?? [];

  return (
    <PageLayout
      description="Forms and check-ins from your coach"
      title="Check-ins"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : assignments.length === 0 ? (
        <div className="rounded-xl border border-divider bg-content1 p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <ClipboardCheck
              className="text-primary"
              size={24}
            />
          </div>
          <h3 className="text-base font-medium">No check-ins yet</h3>
          <p className="mt-2 text-sm text-foreground-500">Your coach hasn&apos;t sent you any check-ins.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {assignments.map((assignment) => {
            const completed = assignment.status === 'completed';
            const due = assignment.due_date ? `Due ${formatIsoDateOnly(assignment.due_date)}` : null;
            return (
              <button
                className="flex min-h-11 items-center gap-3 rounded-xl border border-divider bg-content1 p-4 text-left transition-colors hover:bg-content2"
                key={assignment.id}
                onClick={() => navigate(ROUTES.CHECKIN_FILL.replace(':id', assignment.id))}
                type="button"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ClipboardCheck size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{assignment.form_template?.name ?? 'Check-in'}</p>
                  <p className="text-xs text-foreground-500">
                    {PURPOSE_LABELS[assignment.purpose] ?? 'Form'}
                    {due ? ` · ${due}` : ''}
                  </p>
                </div>
                <span className={`shrink-0 text-xs ${completed ? 'text-foreground-500' : 'font-medium text-primary'}`}>
                  {STATUS_LABELS[assignment.status] ?? assignment.status}
                </span>
                <ChevronRight
                  className="shrink-0 text-foreground-500"
                  size={16}
                />
              </button>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
