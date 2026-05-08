import {Button, Popover, toast} from '@heroui/react';
import {Copy, CopyPlus, MoreHorizontal, X} from 'lucide-react';
import {useState} from 'react';

import type {PlannedSet, WorkoutElement} from '@/api/trainingPlans';
import type {LoadUnitValue} from '@/training-plans/components/unit-picker';

import {useUpdateWorkoutElementMutation} from '@/api/trainingPlans';
import InlineExerciseForm, {
  buildPlannedSetsFromForm,
  deriveFormFromSets,
  type InlineExerciseFormValues,
} from '@/training-plans/components/inline-exercise-form';

// ── Summary formatting ─────────────────────────────────────────────

function formatLoadSummary(set: PlannedSet): string {
  if (!set.load_unit || set.load_unit === 'none') return '';
  if (set.load_unit === 'bodyweight') return set.load_value != null ? `BW + ${set.load_value}` : 'BW';
  if (set.load_value == null) return '';
  if (set.load_unit === 'percent_1rm') return `${set.load_value}% 1RM`;
  if (set.load_unit === 'rpe') return `RPE ${set.load_value}`;
  return `${set.load_value}${set.load_unit}`;
}

/**
 * Collapsed one-line summary: `N × reps @ load · rest Xs`.
 *
 * V3 spec: one target per exercise — always. No more warmup/working split,
 * no "mixed" fallback. The array is always N identical PlannedSets.
 */
export function formatSetSchemeSummary(sets: PlannedSet[]): string {
  if (sets.length === 0) return 'No sets — tap to add';
  const first = sets[0]!;
  const reps = first.target_reps ?? '—';
  const load = formatLoadSummary(first);
  const loadPart = load ? ` @ ${load}` : '';
  const restPart = first.rest_seconds != null ? ` · rest ${first.rest_seconds}s` : '';
  return `${sets.length} × ${reps}${loadPart}${restPart}`;
}

// ── Component ───────────────────────────────────────────────────────

type ExerciseElementProps = {
  element: WorkoutElement;
  /** Session-wide load unit memory (sticks after the first manual change). */
  fallbackLoadUnit?: LoadUnitValue;
  /** True when this row is in edit mode (form open). Only one row edits at a time. */
  isEditing: boolean;
  onCancel: () => void;
  onCopy?: () => void;
  onDuplicate?: () => void;
  onLoadUnitChange?: (unit: LoadUnitValue) => void;
  onRemove: () => void;
  onStartEditing: () => void;
  planId: string;
};

export default function ExerciseElement({
  element,
  fallbackLoadUnit = 'kg',
  isEditing,
  onCancel,
  onCopy,
  onDuplicate,
  onLoadUnitChange,
  onRemove,
  onStartEditing,
  planId,
}: ExerciseElementProps) {
  const [updateElement, {isLoading: isSaving}] = useUpdateWorkoutElementMutation();
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  const exerciseName = element.exercise?.name ?? 'Unknown exercise';
  const hasSecondaryActions = Boolean(onCopy || onDuplicate);

  const handleSave = async (values: InlineExerciseFormValues) => {
    const plannedSets = buildPlannedSetsFromForm(values);
    const trimmedNotes = values.exerciseNotes.trim();
    await updateElement({
      id: element.id,
      planId,
      workoutId: element.workout_id,
      body: {planned_sets: plannedSets, notes: trimmedNotes || null},
    }).unwrap();
    onCancel(); // close form (same callback — edit mode exits on save)
    toast.success('Saved');
  };

  if (isEditing) {
    const defaults: Partial<InlineExerciseFormValues> = {
      ...deriveFormFromSets(element.planned_sets, fallbackLoadUnit),
      exerciseNotes: element.notes ?? '',
    };
    return (
      <InlineExerciseForm
        actionLabel="Save"
        defaultValues={defaults}
        exerciseName={exerciseName}
        isEditing
        isSubmitting={isSaving}
        onCancel={onCancel}
        onLoadUnitChange={onLoadUnitChange}
        onSubmit={handleSave}
      />
    );
  }

  // Collapsed row: tap to edit. Secondary actions live behind an always-visible
  // trigger so they remain available on touch devices.
  return (
    <div className="flex min-h-12 items-center gap-1 rounded-lg px-2 py-1.5 transition-colors hover:bg-content2">
      <button
        aria-label={`Edit ${exerciseName}`}
        className="flex min-w-0 flex-1 touch-manipulation flex-col items-start rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={onStartEditing}
        type="button"
      >
        <span className="block w-full truncate text-sm font-medium">{exerciseName}</span>
        <span className="block w-full truncate text-xs text-foreground-400">
          {formatSetSchemeSummary(element.planned_sets)}
          {element.notes ? <span className="ml-1.5">· {element.notes}</span> : null}
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-0.5">
        {hasSecondaryActions ? (
          <Popover
            isOpen={isActionsOpen}
            onOpenChange={setIsActionsOpen}
          >
            <Popover.Trigger>
              <Button
                aria-label={`More actions for ${exerciseName}`}
                className="min-h-11 min-w-11"
                isIconOnly
                size="sm"
                variant="ghost"
              >
                <MoreHorizontal size={16} />
              </Button>
            </Popover.Trigger>
            <Popover.Content
              className="min-w-[200px] p-1"
              placement="bottom end"
            >
              <Popover.Dialog className="outline-none">
                <div className="flex flex-col gap-1">
                  {onDuplicate ? (
                    <Button
                      className="min-h-11 justify-start"
                      onPress={() => {
                        setIsActionsOpen(false);
                        onDuplicate();
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <CopyPlus size={14} />
                      Duplicate
                    </Button>
                  ) : null}
                  {onCopy ? (
                    <Button
                      className="min-h-11 justify-start"
                      onPress={() => {
                        setIsActionsOpen(false);
                        onCopy();
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <Copy size={14} />
                      Copy to workout
                    </Button>
                  ) : null}
                </div>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
        ) : null}
        <Button
          aria-label={`Remove ${exerciseName}`}
          className="min-h-11 min-w-11"
          isIconOnly
          onPress={onRemove}
          size="sm"
          variant="ghost"
        >
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}
