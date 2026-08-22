import {Chip} from '@heroui/react';
import {Dumbbell} from 'lucide-react';
import type {TrainingPlan} from '@/api/training-plans';
import {BrowseRow} from '@/ui/browse-list-box';

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

export default function TrainingPlanListItem({isFirst, plan}: {isFirst?: boolean; plan: TrainingPlan}) {
  const archived = plan.archived_at !== null;
  const meta = getTrainingPlanMeta(plan);

  return (
    <BrowseRow
      icon={<Dumbbell className="size-5 text-foreground" />}
      id={plan.id}
      meta={meta || plan.description || 'No workouts yet'}
      testId={isFirst ? 'tr-row' : undefined}
      textValue={plan.name}
      title={plan.name}
      trailing={
        <Chip
          color={archived ? 'warning' : 'success'}
          size="sm"
          variant="soft"
        >
          {archived ? 'Archived' : 'Active'}
        </Chip>
      }
    />
  );
}
