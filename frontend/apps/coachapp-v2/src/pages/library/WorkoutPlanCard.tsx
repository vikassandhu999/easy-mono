import {Button, Card} from '@heroui/react';
import {Copy, Dumbbell, UserPlus} from 'lucide-react';

import type {TrainingPlan} from '@/api/trainingPlans';

import {formatDate} from '@/pages/library/libraryData';

type WorkoutPlanCardProps = {
  onAssign: (plan: TrainingPlan) => void;
  onDuplicate: (plan: TrainingPlan) => void;
  onOpenBuilder: (plan: TrainingPlan) => void;
  resource: TrainingPlan;
};

export default function WorkoutPlanCard({onAssign, onDuplicate, onOpenBuilder, resource}: WorkoutPlanCardProps) {
  const statusTone =
    resource.status === 'active'
      ? 'bg-green-500/10 text-green-700'
      : resource.status === 'archived'
        ? 'bg-surface-secondary text-muted'
        : 'bg-amber-500/10 text-amber-700';

  const plannedWorkoutCount = resource.planned_workouts.length;

  return (
    <Card
      className="h-full cursor-pointer border border-separator bg-surface p-4 text-left transition-none hover:bg-surface-secondary"
      onClick={() => onOpenBuilder(resource)}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
              <Dumbbell className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-semibold text-foreground">{resource.name}</span>
              <span className="truncate text-sm text-muted">{resource.is_template ? 'Template' : 'Personal'}</span>
            </div>
          </div>
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusTone}`}>{resource.status}</span>
        </div>

        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            {plannedWorkoutCount} planned workout
            {plannedWorkoutCount === 1 ? '' : 's'}
          </span>
          <span>Updated {formatDate(resource.updated_at)}</span>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-separator pt-3">
          <div
            className="flex items-center gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              className="min-h-11"
              onPress={() => onOpenBuilder(resource)}
              size="sm"
              variant="outline"
            >
              Builder
            </Button>
            <Button
              className="min-h-11"
              onPress={() => onDuplicate(resource)}
              size="sm"
              variant="ghost"
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </Button>
            {resource.is_template ? (
              <Button
                className="min-h-11"
                onPress={() => onAssign(resource)}
                size="sm"
                variant="ghost"
              >
                <UserPlus className="h-4 w-4" />
                Assign
              </Button>
            ) : null}
          </div>
          <span className="text-xs text-muted">Tap to open</span>
        </div>
      </div>
    </Card>
  );
}
