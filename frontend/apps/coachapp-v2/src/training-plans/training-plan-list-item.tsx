import {Chip, Description, Label, ListBox} from '@heroui/react';

import {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import type {TrainingPlan, TrainingPlanStatus} from '@/api/trainingPlans';

const STATUS_MAP: Record<TrainingPlanStatus, {color: 'default' | 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'warning', label: 'Archived'},
};

const UNKNOWN_STATUS = {color: 'default' as const, label: 'Unknown'};

function getTrainingPlanSubtitle(plan: TrainingPlan): string {
  const workoutCount = plan.workouts.length;
  const exerciseCount = plan.workouts.reduce((sum, workout) => sum + workout.workout_elements.length, 0);

  const subtitle = [
    workoutCount > 0 ? `${workoutCount} workout${workoutCount !== 1 ? 's' : ''}` : null,
    exerciseCount > 0 ? `${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return subtitle || plan.description || 'No workouts yet';
}

export default function TrainingPlanListItem({plan}: {plan: TrainingPlan}) {
  const status = STATUS_MAP[plan.status] ?? UNKNOWN_STATUS;

  return (
    <ListBox.Item
      className={LIST_ITEM_CLASS}
      id={plan.id}
      textValue={plan.name}
    >
      <div className="flex min-w-0 flex-col">
        <Label className="truncate">{plan.name}</Label>
        <Description className="truncate">{getTrainingPlanSubtitle(plan)}</Description>
      </div>

      <div className="ms-auto hidden shrink-0 gap-1.5 sm:flex">
        <Chip
          color={status.color}
          size="sm"
          variant="soft"
        >
          {status.label}
        </Chip>
      </div>
    </ListBox.Item>
  );
}
