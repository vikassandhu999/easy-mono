import {X} from 'lucide-react';
import {forwardRef} from 'react';

import type {TrainingPlanPlannedSet} from '@/api/generated';

import {fieldsForTrackingType} from './tracking-fields';

interface SetRowProps {
  set: TrainingPlanPlannedSet;
  index: number;
  /** Exercise tracking_type — drives WHICH measures the summary shows (same
   * source of truth as the SetSheet editor), so the row and sheet never disagree. */
  trackingType: string | null;
  /** Tap the summary to open the SetSheet editor. */
  onTap: () => void;
  /** Remove this set. */
  onRemove: () => void;
  /** False when this is the only set (planned_sets requires ≥1) — hides remove. */
  canRemove: boolean;
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

  // Title-case to match the SetSheet's set-type buttons (Working / Warm-up / Drop).
  const setTypeLabel = set.set_type === 'warmup' ? 'Warm-up' : set.set_type === 'dropset' ? 'Drop' : 'Working';
  parts.push(setTypeLabel);

  // Reps (combined with load when both are tracked, e.g. weight_reps -> "8 × 100kg")
  if (fields.showReps && set.reps !== null && set.reps !== undefined) {
    const load = fields.showLoad ? formatLoad(set) : null;
    parts.push(load ? `${set.reps} × ${load}` : `${set.reps} reps`);
  } else if (fields.showLoad) {
    // Load without reps — either reps aren't tracked (weight_duration,
    // weight_distance) or they're simply blank; still show the weight.
    const load = formatLoad(set);
    if (load) {
      parts.push(load);
    }
  }

  if (fields.showDuration && set.duration_seconds !== null && set.duration_seconds !== undefined) {
    parts.push(`${set.duration_seconds}s`);
  }

  if (fields.showDistance && set.distance_value !== null && set.distance_value !== undefined) {
    const distUnit = set.distance_unit === 'miles' ? 'mi' : set.distance_unit === 'km' ? 'km' : 'm';
    parts.push(`${set.distance_value}${distUnit}`);
  }

  if (fields.showRpe && set.rpe !== null && set.rpe !== undefined) {
    // rpe is a decimal at the API; Number() drops a trailing ".0" (10.0 -> 10, 8.5 -> 8.5).
    parts.push(`RPE ${Number(set.rpe)}`);
  }

  return parts.join(' · ');
}

export const SetRow = forwardRef<HTMLButtonElement, SetRowProps>(function SetRow(
  {set, index, trackingType, onTap, onRemove, canRemove},
  ref,
) {
  return (
    // Without the remove button (single set) the summary text is the last
    // element — pr-2.5 keeps it off the card's right border, matching the
    // optical inset the X button's hit area provides when it is rendered.
    <div className={`flex items-center gap-2 ${canRemove ? '' : ' pr-2.5'}`}>
      {/* Tap the summary to edit this set in the SetSheet */}
      <button
        ref={ref}
        className="min-w-0 flex-1 text-left text-xs text-muted transition-colors hover:text-foreground"
        onClick={onTap}
        type="button"
      >
        <span className="mr-1.5 font-medium text-foreground">Set {index + 1}</span>
        {formatSetSummary(set, trackingType)}
      </button>

      {canRemove ? (
        <button
          aria-label={`Remove set ${index + 1}`}
          className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded text-muted transition-colors hover:text-danger"
          onClick={onRemove}
          type="button"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
});
