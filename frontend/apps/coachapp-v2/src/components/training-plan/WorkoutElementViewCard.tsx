import {Button, Card} from '@heroui/react';
import {Dumbbell, Pencil, Trash2} from 'lucide-react';

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
    <Card className="group rounded-xl border border-separator bg-surface p-0 transition-all duration-200 hover:border-blue-200 hover:shadow-sm">
      <div className="flex items-center gap-0">
        {/* Position badge */}
        <div className="flex items-center justify-center border-r border-separator px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <span className="text-xs font-bold">{index + 1}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
            <Dumbbell className="h-4 w-4 text-muted" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{exerciseName}</p>
            <p className="text-xs text-muted">{getSetSummary()}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 border-l border-separator px-3">
          <Button
            className="min-h-9 text-xs"
            onPress={onEdit}
            size="sm"
            variant="ghost"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            className="min-h-9 min-w-9"
            isDisabled={isDeleting}
            isIconOnly
            onPress={onDelete}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
