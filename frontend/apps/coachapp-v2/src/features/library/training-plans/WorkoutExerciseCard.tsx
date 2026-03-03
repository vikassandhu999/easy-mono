import {Button} from '@heroui/react';
import {ChevronDown, ChevronRight, ChevronUp, Dumbbell} from 'lucide-react';

import type {WorkoutElement} from '@/entities/trainingPlans/api/trainingPlans';

type WorkoutExerciseCardProps = {
  canMove: {down: boolean; up: boolean};
  element: WorkoutElement;
  exerciseName: string;
  onMove: (direction: 'down' | 'up') => void;
  onTap: () => void;
};

function getSetSummary(element: WorkoutElement): string {
  if (element.planned_sets.length === 0) return 'No sets';
  const count = element.planned_sets.length;
  const first = element.planned_sets[0];
  const reps = first?.target_reps ?? '-';
  const load = first?.load_value != null ? String(first.load_value) : '-';
  const unit = first?.load_unit && first.load_unit !== 'none' ? first.load_unit : '';

  if (count === 1) return `${reps} @ ${load}${unit}`;
  return `${count} sets x ${reps} @ ${load}${unit}`;
}

export function WorkoutExerciseCard({canMove, element, exerciseName, onMove, onTap}: WorkoutExerciseCardProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1">
      <div className="flex flex-col">
        <Button
          aria-label="Move exercise up"
          className="min-h-7 min-w-7"
          isDisabled={!canMove.up}
          isIconOnly
          onPress={() => onMove('up')}
          size="sm"
          variant="ghost"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          aria-label="Move exercise down"
          className="min-h-7 min-w-7"
          isDisabled={!canMove.down}
          isIconOnly
          onPress={() => onMove('down')}
          size="sm"
          variant="ghost"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>
      <button
        className="flex flex-1 cursor-pointer items-center gap-3 border-none bg-transparent py-2 text-left outline-none"
        onClick={onTap}
        type="button"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
          <Dumbbell className="h-4 w-4 text-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{exerciseName}</p>
          <p className="text-xs text-muted">{getSetSummary(element)}</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
      </button>
    </div>
  );
}
