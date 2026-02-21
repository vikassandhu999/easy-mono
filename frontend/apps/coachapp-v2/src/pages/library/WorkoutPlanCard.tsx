import {Button} from '@heroui/react';
import {Copy, Dumbbell, UserPlus} from 'lucide-react';

import type {TrainingPlan} from '@/api/trainingPlans';

import LibraryCard from '@/components/LibraryCard';
import {formatDate, toSentenceCase} from '@/pages/library/libraryShared';

type WorkoutPlanCardProps = {
  onAssign: (plan: TrainingPlan) => void;
  onDuplicate: (plan: TrainingPlan) => void;
  onOpenBuilder: (plan: TrainingPlan) => void;
  resource: TrainingPlan;
};

export default function WorkoutPlanCard({onAssign, onDuplicate, onOpenBuilder, resource}: WorkoutPlanCardProps) {
  const plannedWorkoutCount = resource.planned_workouts.length;

  return (
    <LibraryCard
      icon={<Dumbbell className="h-5 w-5 text-foreground" />}
      meta={{
        actions: (
          <>
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
          </>
        ),
        badge: (
          <span className="rounded-full bg-surface-secondary px-2 py-1 text-xs font-medium text-muted">
            {toSentenceCase(resource.status)}
          </span>
        ),
        hint: 'Tap to open',
      }}
      onPress={() => onOpenBuilder(resource)}
      subtitle={resource.is_template ? 'Template' : 'Personal'}
      title={resource.name}
    >
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          {plannedWorkoutCount} planned workout
          {plannedWorkoutCount === 1 ? '' : 's'}
        </span>
        <span>Updated {formatDate(resource.updated_at)}</span>
      </div>
    </LibraryCard>
  );
}
