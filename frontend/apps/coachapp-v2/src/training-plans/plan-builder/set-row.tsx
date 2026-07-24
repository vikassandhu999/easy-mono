/**
 * SetList — the planned sets of one exercise (badge TB).
 *
 * Each row is a tap target that opens the SetSheet editor, with a `×` that
 * removes the set — the shape the prototype draws.
 *
 * GAPS.md #7 calls for `ListBox` items here, but an item cannot host the row's
 * own `×` (no interactive control inside an option), and the workaround — a
 * parallel column of buttons beside the list — drifts out of alignment as soon
 * as the two columns' row heights differ, which the design's 22px `×` guarantees.
 * So rows are plain elements with two buttons, mirroring the nutrition builder's
 * meal-item rows.
 */
import {Button} from '@heroui/react';
import {X} from 'lucide-react';

import {AS_TEXT, NO_GAP} from '@/@components/ua-defaults';
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
    <div className="flex flex-col">
      {sets.map((set, index) => (
        <div
          className="flex items-center gap-2 py-1"
          data-testid={index === 0 ? 'tb-set-row' : undefined}
          key={index}
        >
          <Button
            className={`h-auto min-h-11 min-w-0 flex-1 justify-start p-0 text-left [box-shadow:none] sm:min-h-0 ${AS_TEXT} ${NO_GAP}`}
            onPress={() => onOpenSet(index)}
            ref={(el: HTMLButtonElement | null) => registerRowRef(index, el)}
            variant="ghost"
          >
            <span
              className="min-w-0 truncate text-eyebrow text-muted"
              data-testid={index === 0 ? 'tb-set-summary' : undefined}
            >
              <span
                className="mr-1.5 font-semibold text-foreground"
                data-testid={index === 0 ? 'tb-set-label' : undefined}
              >
                Set {index + 1}
              </span>
              {formatSetSummary(set, trackingType)}
            </span>
          </Button>

          {canRemove ? (
            <Button
              aria-label={`Remove set ${index + 1} of ${exerciseName}`}
              className={`min-h-11 min-w-11 shrink-0 rounded-chip bg-transparent p-0 text-muted [box-shadow:none] sm:size-5.5 sm:min-h-0 sm:min-w-0 ${AS_TEXT} ${NO_GAP}`}
              data-testid={index === 0 ? 'tb-remove-set' : undefined}
              isIconOnly
              onPress={() => onRemoveSet(index)}
              variant="ghost"
            >
              <X className="size-3.25" />
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
