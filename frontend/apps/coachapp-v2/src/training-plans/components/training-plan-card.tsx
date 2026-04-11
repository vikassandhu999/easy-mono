import {Chip} from '@heroui/react';
import {Dumbbell} from 'lucide-react';
import {Link} from 'react-router-dom';

import type {TrainingPlan, TrainingPlanStatus} from '@/api/trainingPlans';

const STATUS_MAP: Record<TrainingPlanStatus, {color: 'default' | 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'warning', label: 'Archived'},
};

const UNKNOWN_STATUS = {color: 'default' as const, label: 'Unknown'};

export default function TrainingPlanCard({plan}: {plan: TrainingPlan}) {
  const status = STATUS_MAP[plan.status] ?? UNKNOWN_STATUS;
  const workouts = plan.planned_workouts ?? [];
  const workoutCount = workouts.length;
  const exerciseCount = workouts.reduce((sum, w) => sum + w.workout_elements.length, 0);

  const subtitle = [
    workoutCount > 0 ? `${workoutCount} workout${workoutCount !== 1 ? 's' : ''}` : null,
    exerciseCount > 0 ? `${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}` : null,
  ]
    .filter(Boolean)
    .join(' \u00b7 ');

  return (
    <Link
      className="flex min-h-11 items-center gap-3 rounded-xl border border-divider bg-content1 p-3 transition-colors hover:bg-content2 active:bg-content2 sm:p-4"
      to={`/library/training-plans/${plan.id}`}
    >
      {/* Icon */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-content2">
        <Dumbbell
          className="text-foreground-400"
          size={20}
        />
      </div>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{plan.name}</p>
        {subtitle ? (
          <p className="text-xs text-foreground-500">{subtitle}</p>
        ) : plan.description ? (
          <p className="truncate text-xs text-foreground-500">{plan.description}</p>
        ) : (
          <p className="text-xs text-foreground-400">No workouts yet</p>
        )}
      </div>

      {/* Status chip — hidden on small screens */}
      <div className="hidden gap-1.5 sm:flex">
        <Chip
          color={status.color}
          size="sm"
          variant="soft"
        >
          {status.label}
        </Chip>
      </div>
    </Link>
  );
}
