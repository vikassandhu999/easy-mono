import {ChevronRight} from 'lucide-react';
import {useNavigate} from 'react-router';

import type {PlannedWorkout} from '@/entities/trainingPlans/api/trainingPlans';

type WorkoutDayCardProps = {
  dayLabel: string;
  plannedWorkout: PlannedWorkout;
};

export function WorkoutDayCard({dayLabel, plannedWorkout}: WorkoutDayCardProps) {
  const navigate = useNavigate();
  const planId = plannedWorkout.training_plan_id;
  const elementCount = plannedWorkout.workout_elements.length;
  const totalSets = plannedWorkout.workout_elements.reduce((total, el) => total + el.planned_sets.length, 0);

  return (
    <button
      className="flex w-full cursor-pointer items-center border-none bg-transparent text-left outline-none transition-colors hover:bg-surface-secondary"
      onClick={() => navigate(`/library/training-plans/${planId}/builder/workouts/${plannedWorkout.id}`)}
      type="button"
    >
      <div className="flex w-12 shrink-0 items-center justify-center self-stretch border-r border-separator">
        <span className="text-xs font-semibold text-muted">{dayLabel}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{plannedWorkout.name}</p>
          <p className="text-xs text-muted">
            {elementCount} exercise{elementCount === 1 ? '' : 's'} · {totalSets} set{totalSets === 1 ? '' : 's'}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
      </div>
    </button>
  );
}
