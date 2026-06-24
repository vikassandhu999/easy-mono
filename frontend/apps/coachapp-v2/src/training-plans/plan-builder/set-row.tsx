import {forwardRef} from 'react';

import type {TrainingPlanPlannedSet} from '@/api/generated';

interface SetRowProps {
  set: TrainingPlanPlannedSet;
  index: number;
  onTap: () => void;
}

function formatSetSummary(set: TrainingPlanPlannedSet): string {
  const parts: string[] = [];

  const setTypeLabel =
    set.set_type === 'warmup' ? 'warm-up' : set.set_type === 'dropset' ? 'drop' : (set.set_type ?? 'working');

  parts.push(setTypeLabel);

  if (set.reps !== null && set.reps !== undefined) {
    if (set.load_value !== null && set.load_value !== undefined && set.load_unit !== 'none' && set.load_unit !== null) {
      const unit = set.load_unit === 'bodyweight' ? 'bw' : (set.load_unit ?? 'kg');
      parts.push(`${set.reps} × ${set.load_value}${unit}`);
    } else {
      parts.push(`${set.reps} reps`);
    }
  } else if (set.duration_seconds !== null && set.duration_seconds !== undefined) {
    parts.push(`${set.duration_seconds}s`);
  } else if (set.distance_value !== null && set.distance_value !== undefined) {
    const distUnit = set.distance_unit && set.distance_unit !== 'none' ? set.distance_unit : 'm';
    parts.push(`${set.distance_value}${distUnit}`);
  }

  if (set.rpe !== null && set.rpe !== undefined) {
    parts.push(`RPE ${set.rpe}`);
  }

  return parts.join(' · ');
}

export const SetRow = forwardRef<HTMLButtonElement, SetRowProps>(function SetRow({set, index, onTap}, ref) {
  return (
    <button
      ref={ref}
      className="flex w-full items-center justify-between py-1.5 text-left text-xs text-muted hover:text-foreground transition-colors"
      onClick={onTap}
      type="button"
    >
      <span>
        <span className="mr-1.5 text-muted">Set {index + 1}</span>
        {formatSetSummary(set)}
      </span>
      <span className="text-muted text-[10px]">···</span>
    </button>
  );
});
