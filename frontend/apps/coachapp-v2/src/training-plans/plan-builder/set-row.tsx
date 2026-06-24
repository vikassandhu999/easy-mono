import {forwardRef} from 'react';

import type {TrainingPlanPlannedSet} from '@/api/generated';

import {fieldsForTrackingType} from './tracking-fields';

interface SetRowProps {
  set: TrainingPlanPlannedSet;
  index: number;
  /** Exercise tracking_type — drives WHICH measures the summary shows (same
   * source of truth as the SetSheet editor), so the row and sheet never disagree. */
  trackingType: string | null;
  onTap: () => void;
}

function formatLoad(set: TrainingPlanPlannedSet): string | null {
  if (set.load_value === null || set.load_value === undefined || set.load_unit === 'none' || set.load_unit === null) {
    return null;
  }
  const unit = set.load_unit === 'bodyweight' ? 'bw' : set.load_unit;
  return `${set.load_value}${unit}`;
}

function formatSetSummary(set: TrainingPlanPlannedSet, trackingType: string | null): string {
  const fields = fieldsForTrackingType(trackingType);
  const parts: string[] = [];

  const setTypeLabel =
    set.set_type === 'warmup' ? 'warm-up' : set.set_type === 'dropset' ? 'drop' : (set.set_type ?? 'working');
  parts.push(setTypeLabel);

  // Reps (combined with load when both are tracked, e.g. weight_reps -> "8 × 100kg")
  if (fields.showReps && set.reps !== null && set.reps !== undefined) {
    const load = fields.showLoad ? formatLoad(set) : null;
    parts.push(load ? `${set.reps} × ${load}` : `${set.reps} reps`);
  } else if (fields.showLoad && !fields.showReps) {
    // Load tracked without reps (weight_duration, weight_distance)
    const load = formatLoad(set);
    if (load) {
      parts.push(load);
    }
  }

  if (fields.showDuration && set.duration_seconds !== null && set.duration_seconds !== undefined) {
    parts.push(`${set.duration_seconds}s`);
  }

  if (fields.showDistance && set.distance_value !== null && set.distance_value !== undefined) {
    const distUnit = set.distance_unit && set.distance_unit !== 'none' ? set.distance_unit : 'm';
    parts.push(`${set.distance_value}${distUnit}`);
  }

  if (fields.showRpe && set.rpe !== null && set.rpe !== undefined) {
    parts.push(`RPE ${set.rpe}`);
  }

  return parts.join(' · ');
}

export const SetRow = forwardRef<HTMLButtonElement, SetRowProps>(function SetRow(
  {set, index, trackingType, onTap},
  ref,
) {
  return (
    <button
      ref={ref}
      className="flex w-full items-center justify-between py-1.5 text-left text-xs text-muted hover:text-foreground transition-colors"
      onClick={onTap}
      type="button"
    >
      <span>
        <span className="mr-1.5 text-muted">Set {index + 1}</span>
        {formatSetSummary(set, trackingType)}
      </span>
      <span className="text-muted text-[10px]">···</span>
    </button>
  );
});
