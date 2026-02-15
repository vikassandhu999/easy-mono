import {Button, Card} from '@heroui/react';
import {Trash2} from 'lucide-react';

import type {Exercise} from '@/api/exercises';
import type {WorkoutElement} from '@/api/trainingPlans';

interface WorkoutElementViewCardProps {
  element: WorkoutElement;
  exercises: Exercise[];
  index: number;
  isDeleting: boolean;
  onDelete: () => void;
  onEdit: () => void;
}

export function WorkoutElementViewCard({
  element,
  index,
  exercises,
  onEdit,
  onDelete,
  isDeleting,
}: WorkoutElementViewCardProps) {
  const exerciseName =
    element.exercise?.name ?? exercises.find((e) => e.id === element.exercise_id)?.name ?? 'Exercise';

  const getSetSummary = () => {
    if (element.planned_sets.length === 0) return 'No sets';
    const setCount = element.planned_sets.length;
    // Assuming uniform sets for summary, or just taking the first one
    const firstSet = element.planned_sets[0];
    const reps = firstSet?.target_reps ?? '-';
    const load = firstSet?.load_value ?? '-';
    const unit = firstSet?.load_unit ?? '';

    if (setCount === 1) {
      return `${reps} reps @ ${load}${unit}`;
    }
    return `${setCount} sets × ${reps} reps @ ${load}${unit}`;
  };

  return (
    <Card className="rounded-xl border border-separator bg-surface p-4 transition-colors hover:bg-surface-secondary/50">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-secondary">
          <span className="text-sm font-semibold text-foreground">{index + 1}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{exerciseName}</p>
          <p className="text-sm text-muted">{getSetSummary()}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            className="min-h-11"
            onPress={onEdit}
            size="sm"
            variant="ghost"
          >
            Edit sets
          </Button>
          <Button
            className="min-h-11"
            isDisabled={isDeleting}
            onPress={onDelete}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
