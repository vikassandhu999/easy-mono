import {Chip, Description, Label, ListBox} from '@heroui/react';
import {ChevronRight, Dumbbell} from 'lucide-react';

import {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
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
    <ListBox.Item
      className={LIST_ITEM_CLASS}
      id={plan.id}
      textValue={plan.name}
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-secondary">
        <Dumbbell className="size-5 text-foreground" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Label className="max-w-full truncate text-sm font-semibold text-foreground">{plan.name}</Label>
        <Description className="max-w-full truncate text-xs text-muted">
          {meta || plan.description || 'No workouts yet'}
        </Description>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Chip
          color={status.color}
          size="sm"
          variant="soft"
        >
          {status.label}
        </Chip>
        <ChevronRight className="size-4 shrink-0 text-muted-2" />
      </div>
    </ListBox.Item>
  );
}
