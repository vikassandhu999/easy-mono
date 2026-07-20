import {Chip} from '@heroui/react';
import {Dumbbell} from 'lucide-react';

import {BrowseRow} from '@/@components/browse-list-box';
import type {TrainingPlan} from '@/api/generated';

type TrainingPlanStatus = TrainingPlan['status'];

const STATUS_MAP: Record<TrainingPlanStatus, {color: 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'warning', label: 'Archived'},
};

function getTrainingPlanMeta(plan: TrainingPlan): string {
  const workoutCount = plan.workouts.length;
  const exerciseCount = plan.workouts.reduce((sum, workout) => sum + workout.workout_elements.length, 0);

  return [
    workoutCount > 0 ? `${workoutCount} workout${workoutCount !== 1 ? 's' : ''}` : null,
    exerciseCount > 0 ? `${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function TrainingPlanListItem({plan}: {plan: TrainingPlan}) {
  const status = STATUS_MAP[plan.status];
  const meta = getTrainingPlanMeta(plan);

  return (
    <BrowseRow
      icon={<Dumbbell className="size-5 text-foreground" />}
      id={plan.id}
      meta={meta || plan.description || 'No workouts yet'}
      textValue={plan.name}
      title={plan.name}
      trailing={
        <Chip
          color={status.color}
          size="sm"
          variant="soft"
        >
          {status.label}
        </Chip>
      }
    />
  );
}
