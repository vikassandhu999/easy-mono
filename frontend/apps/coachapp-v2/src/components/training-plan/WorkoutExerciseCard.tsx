import {Card} from '@heroui/react';
import {ChevronRight, Dumbbell} from 'lucide-react';

import type {WorkoutElement} from '@/api/trainingPlans';

type WorkoutExerciseCardProps = {
  element: WorkoutElement;
  exerciseName: string;
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

export function WorkoutExerciseCard({element, exerciseName, onTap}: WorkoutExerciseCardProps) {
  return (
    <Card className="rounded-xl border border-separator bg-surface p-0 transition-all duration-200 hover:border-border">
      <button
        className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-4 py-3 text-left outline-none"
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
    </Card>
  );
}
