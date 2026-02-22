import {Dumbbell} from 'lucide-react';

import type {TrainingPlan} from '@/api/trainingPlans';

import LibraryCard from '@/components/LibraryCard';
import {formatDate, toSentenceCase} from '@/pages/library/libraryShared';

type WorkoutPlanCardProps = {
  onOpenBuilder: (plan: TrainingPlan) => void;
  resource: TrainingPlan;
};

export default function WorkoutPlanCard({onOpenBuilder, resource}: WorkoutPlanCardProps) {
  const plannedWorkoutCount = resource.planned_workouts.length;

  return (
    <LibraryCard
      badge={
        <span className="rounded-full bg-surface-secondary px-2 py-1 text-xs font-medium text-muted">
          {toSentenceCase(resource.status)}
        </span>
      }
      icon={<Dumbbell className="h-5 w-5 text-foreground" />}
      onPress={() => onOpenBuilder(resource)}
      subtitle={resource.is_template ? 'Template' : 'Personal'}
      title={resource.name}
    >
      <div className="flex min-w-0 items-center justify-between gap-2 text-sm text-muted">
        <span className="truncate">
          {plannedWorkoutCount} planned workout
          {plannedWorkoutCount === 1 ? '' : 's'}
        </span>
        <span className="shrink-0">Updated {formatDate(resource.updated_at)}</span>
      </div>
    </LibraryCard>
  );
}
