import {Button, Card} from '@heroui/react';
import {Dumbbell, Pencil, Trash2} from 'lucide-react';
import {useLocation, useNavigate} from 'react-router';

import type {PlannedWorkout} from '@/api/trainingPlans';

type TrainingPlanDayCardProps = {
  isMutating: boolean;
  onDeleteDay: (plannedWorkoutId: string) => Promise<void>;
  plannedWorkout: PlannedWorkout;
};

export default function TrainingPlanDayCard({isMutating, onDeleteDay, plannedWorkout}: TrainingPlanDayCardProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const elementCount = plannedWorkout.workout_elements.length;
  const totalSets = plannedWorkout.workout_elements.reduce((total, element) => total + element.planned_sets.length, 0);

  return (
    <Card className="rounded-xl border border-separator bg-surface p-4 transition-colors hover:bg-surface-secondary/50">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-secondary">
          <span className="text-sm font-semibold text-foreground">{plannedWorkout.day_number}</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{plannedWorkout.name}</p>
          <p className="text-sm text-muted">
            {elementCount} exercise{elementCount === 1 ? '' : 's'} · {totalSets}
            set
            {totalSets === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            aria-label="Edit day"
            className="min-h-11"
            onPress={() =>
              navigate(
                `/library/training-plans/${plannedWorkout.training_plan_id}/builder/days/${plannedWorkout.id}/edit`,
                {state: {from: location.pathname}},
              )
            }
            size="sm"
            variant="ghost"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Delete day"
            className="min-h-11"
            isDisabled={isMutating}
            onPress={() => onDeleteDay(plannedWorkout.id)}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            className="min-h-11"
            onPress={() =>
              navigate(
                `/library/training-plans/${plannedWorkout.training_plan_id}/builder/days/${plannedWorkout.id}/exercises`,
                {state: {from: location.pathname}},
              )
            }
            size="sm"
            variant="outline"
          >
            <Dumbbell className="h-4 w-4" />
            <span className="hidden sm:inline">Manage</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
