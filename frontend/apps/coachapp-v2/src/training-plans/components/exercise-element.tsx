import {Button, Popover, toast} from '@heroui/react';
import {MoreHorizontal} from 'lucide-react';
import {useState} from 'react';

import type {PlannedSet, WorkoutElement} from '@/api/trainingPlans';
import {useUpdateWorkoutElementMutation} from '@/api/trainingPlans';
import InlineExerciseForm, {
  buildPlannedSetsFromForm,
  deriveFormFromSets,
  type InlineExerciseFormValues,
} from '@/training-plans/components/inline-exercise-form';
import type {LoadUnitValue} from '@/training-plans/components/unit-picker';

function formatLoadSummary(set: PlannedSet): string {
  if (!set.load_unit || set.load_unit === 'none') {
    return '';
  }
  if (set.load_unit === 'bodyweight') {
    return set.load_value != null ? `BW + ${set.load_value}` : 'BW';
  }
  if (set.load_value == null) {
    return '';
  }
  if (set.load_unit === 'percent_1rm') {
    return `${set.load_value}% 1RM`;
  }
  if (set.load_unit === 'rpe') {
    return `RPE ${set.load_value}`;
  }
  return `${set.load_value}${set.load_unit}`;
}

/**
 * Collapsed one-line summary: `N × reps @ load · rest Xs`.
 *
 * V3 spec: one target per exercise — always. No more warmup/working split,
 * no "mixed" fallback. The array is always N identical PlannedSets.
 */
export function formatSetSchemeSummary(sets: PlannedSet[]): string {
  if (sets.length === 0) {
    return 'No sets — tap to add';
  }
  const first = sets[0]!;
  const reps = first.target_reps ?? '—';
  const load = formatLoadSummary(first);
  const loadPart = load ? ` @ ${load}` : '';
  const restPart = first.rest_seconds != null ? ` · rest ${first.rest_seconds}s` : '';
  return `${sets.length} × ${reps}${loadPart}${restPart}`;
}

type ExerciseElementProps = {
  element: WorkoutElement;
  fallbackLoadUnit?: LoadUnitValue;
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
      <Button
        aria-label={`Edit ${exerciseName}`}
        className="flex min-w-0 flex-1 touch-manipulation flex-col items-start rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onPress={onStartEditing}
        variant="ghost"
      >
        <span className="block w-full truncate text-sm font-medium">{exerciseName}</span>
        <span className="block w-full truncate text-xs text-foreground-400">
          {formatSetSchemeSummary(element.planned_sets)}
          {element.notes ? <span className="ml-1.5">· {element.notes}</span> : null}
        </span>
      </Button>

      <div className="flex shrink-0 items-center gap-0.5">
        <Popover
          isOpen={isActionsOpen}
          onOpenChange={setIsActionsOpen}
        >
          <Popover.Trigger>
            <Button
              aria-label={`Actions for ${exerciseName}`}
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
              {onDuplicate ? (
                <ExerciseActionItem
                  onSelect={() => {
                    setIsActionsOpen(false);
                    onDuplicate();
                  }}
                >
                  Duplicate
                </ExerciseActionItem>
              ) : null}
              {onCopy ? (
                <ExerciseActionItem
                  onSelect={() => {
                    setIsActionsOpen(false);
                    onCopy();
                  }}
                >
                  Copy to workout
                </ExerciseActionItem>
              ) : null}
              {hasSecondaryActions ? <div className="my-1 h-px bg-divider" /> : null}
              <ExerciseActionItem
                isDanger
                onSelect={() => {
                  setIsActionsOpen(false);
                  onRemove();
                }}
              >
                Remove
              </ExerciseActionItem>
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      </div>
    </div>
  );
}

function ExerciseActionItem({
  children,
  isDanger,
  onSelect,
}: {
  children: React.ReactNode;
  isDanger?: boolean;
  onSelect: () => void;
}) {
  return (
    <Button
      className={[
        'flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors',
        'hover:bg-content2 active:bg-content2',
        isDanger ? 'text-danger' : '',
      ].join(' ')}
      onPress={onSelect}
      variant={isDanger ? 'danger' : 'ghost'}
    >
      {children}
    </Button>
  );
}
