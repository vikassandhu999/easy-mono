import {Button, Skeleton} from '@heroui/react';
import {useNavigate} from '@tanstack/react-router';
import {Dumbbell, Plus} from 'lucide-react';

import type {TrainingPlan} from '@/entities/trainingPlans/api/trainingPlans';

import ClientPlanCard from '@/features/clients/ClientPlanCard';
import {formatDate} from '@/shared/lib/format/formatHelpers';

type ClientTrainingTabProps = {
  isLoading: boolean;
  onAssign: () => void;
  plans: TrainingPlan[];
};

const formatDateRange = (plan: TrainingPlan): string | undefined => {
  if (!plan.start_date && !plan.end_date) return undefined;
  const start = plan.start_date ? formatDate(plan.start_date) : '…';
  const end = plan.end_date ? formatDate(plan.end_date) : '…';
  return `${start} – ${end}`;
};

export default function ClientTrainingTab({isLoading, onAssign, plans}: ClientTrainingTabProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton
            className="h-20 w-full rounded-xl"
            key={i}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Training plans</h2>
        <Button
          onPress={onAssign}
          size="sm"
          variant="primary"
        >
          <Plus className="mr-1 h-4 w-4" />
          Assign plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-separator bg-surface py-12">
          <Dumbbell className="h-10 w-10 text-muted" />
          <p className="font-medium text-foreground">No training plans yet</p>
          <p className="text-sm text-muted">Assign a template to get started</p>
          <Button
            className="mt-2"
            onPress={onAssign}
            size="sm"
            variant="ghost"
          >
            Assign plan
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => (
            <ClientPlanCard
              dateRange={formatDateRange(plan)}
              itemCount={`${plan.planned_workouts.length} workout${plan.planned_workouts.length !== 1 ? 's' : ''}`}
              key={plan.id}
              name={plan.name}
              onOpen={() => navigate({to: `/library/training-plans/${plan.id}/builder`})}
              status={plan.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}
