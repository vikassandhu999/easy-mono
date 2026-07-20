/**
 * SetList — the planned sets of one exercise (badge TB).
 *
 * GAPS.md #7: set rows are `ListBox` items and the whole row is the tap target
 * (it opens the SetSheet editor). `selectionMode="none"` is required — a
 * selection-mode collection routes activation through onSelectionChange and
 * never fires `onAction`.
 *
 * The `×` that removes a set sits outside the ListBox's item collection, in a
 * sibling column, so no interactive control is nested inside an option.
 */
import {Button, ListBox} from '@heroui/react';
import {X} from 'lucide-react';

import type {TrainingPlanPlannedSet} from '@/api/generated';

import {fieldsForTrackingType} from './tracking-fields';

// ---------------------------------------------------------------------------
// Summary formatting
// ---------------------------------------------------------------------------

function formatLoad(set: TrainingPlanPlannedSet): string | null {
  if (set.load_value === null || set.load_value === undefined || set.load_unit === 'none' || set.load_unit === null) {
    return null;
  }
  const unit = set.load_unit === 'bodyweight' ? 'bw' : set.load_unit;
  return `${set.load_value}${unit}`;
}

export function formatSetSummary(set: TrainingPlanPlannedSet, trackingType: string | null): string {
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SetListProps {
  sets: TrainingPlanPlannedSet[];
  /** Exercise tracking_type — drives WHICH measures each summary shows (same
   * source of truth as the SetSheet editor), so rows and sheet never disagree. */
  trackingType: string | null;
  exerciseName: string;
  /** Tap a row to open the SetSheet editor on that set. */
  onOpenSet: (index: number) => void;
  onRemoveSet: (index: number) => void;
  /** Registers each row element as the desktop popover anchor for its set. */
  registerRowRef: (index: number, el: HTMLElement | null) => void;
}

export function SetList({sets, trackingType, exerciseName, onOpenSet, onRemoveSet, registerRowRef}: SetListProps) {
  // planned_sets requires ≥1 — the last remaining set is not removable
  // (INTERACTIONS.md § TB).
  const canRemove = sets.length > 1;

  return (
    <div className="flex items-stretch">
      <ListBox
        aria-label={`Sets for ${exerciseName}`}
        className="min-w-0 flex-1 gap-0 border-none bg-transparent p-0 shadow-none"
        onAction={(key) => onOpenSet(Number(key))}
        selectionMode="none"
      >
        {sets.map((set, index) => (
          <ListBox.Item
            className="min-h-11 rounded-none px-0 py-0"
            id={String(index)}
            key={index}
            ref={(el: HTMLElement | null) => registerRowRef(index, el)}
            textValue={`Set ${index + 1}`}
          >
            <span className="min-w-0 truncate text-sm text-muted">
              <span className="mr-1.5 font-semibold text-foreground">Set {index + 1}</span>
              {formatSetSummary(set, trackingType)}
            </span>
          </ListBox.Item>
        ))}
      </ListBox>

      {canRemove ? (
        <div className="flex shrink-0 flex-col">
          {sets.map((_, index) => (
            <Button
              aria-label={`Remove set ${index + 1} of ${exerciseName}`}
              className="size-11 min-w-11 text-muted-2"
              key={index}
              isIconOnly
              onPress={() => onRemoveSet(index)}
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
