/**
 * ExerciseRow — one exercise group inside a workout card.
 *
 * Width discipline: ONE 10px left indent anchored by a 2px accent rule
 * (border-accent). Set rows and the "+ set" button sit flush within that group —
 * no additional nesting or padding per level.
 *
 * "+ set" appends a default working set via PATCH planned_sets, then opens
 * the SetSheet on the new set.
 */
import {toast} from '@heroui/react';
import {ChevronDown, ChevronUp, X} from 'lucide-react';
import {useRef, useState} from 'react';
import type {TrainingPlanPlannedSet, TrainingPlanWorkoutExercise} from '@/api/generated';
import {coachApi, useUpdateWorkoutElementMutation} from '@/api/generated';
import {useAppDispatch} from '@/store';

import {SetRow} from './set-row';
import {SetSheet} from './set-sheet';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExerciseRowProps {
  workoutExercise: TrainingPlanWorkoutExercise;
  planId: string;
  /** Position of this exercise within the workout (for reordering). */
  index: number;
  isFirst: boolean;
  isLast: boolean;
  /** Move this exercise up (-1) or down (+1) within the workout. */
  onMove: (index: number, direction: -1 | 1) => void;
  /** Remove this exercise from the workout. */
  onRemove: () => void;
}

// ---------------------------------------------------------------------------
// Default set factory
// ---------------------------------------------------------------------------

function makeDefaultSet(): TrainingPlanPlannedSet {
  return {
    set_type: 'working',
    reps: null,
    load_value: null,
    load_unit: 'kg',
    duration_seconds: null,
    distance_value: null,
    distance_unit: 'meters',
    rpe: null,
    rest_seconds: null,
    notes: null,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExerciseRow({workoutExercise, planId, index, isFirst, isLast, onMove, onRemove}: ExerciseRowProps) {
  const dispatch = useAppDispatch();
  const [updateElement] = useUpdateWorkoutElementMutation();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeSetIndex, setActiveSetIndex] = useState(0);

  // Ref for the active set row button — used as the desktop popover anchor
  const activeSetButtonRef = useRef<HTMLButtonElement | null>(null);
  const setButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const openSet = (index: number) => {
    activeSetButtonRef.current = setButtonRefs.current[index] ?? null;
    setActiveSetIndex(index);
    setSheetOpen(true);
  };

  const handleAddSet = async () => {
    // A new set defaults to a copy of the previous (last) set so the coach tweaks
    // rather than re-enters; falls back to a blank set only if somehow empty.
    const sets = workoutExercise.planned_sets;
    const previous = sets[sets.length - 1];
    const newSet: TrainingPlanPlannedSet = previous ? {...previous} : makeDefaultSet();
    const updatedSets = [...sets, newSet];
    const newIndex = updatedSets.length - 1;

    try {
      await updateElement({
        id: workoutExercise.id,
        trainingWorkoutExerciseRequest: {planned_sets: updatedSets},
      }).unwrap();
      // Reflect the appended set in the listWorkouts cache immediately so the
      // new SetRow renders before any field edit.
      dispatch(
        coachApi.util.updateQueryData('listWorkouts', {planId, limit: 100}, (draft) => {
          for (const workout of draft.data) {
            const idx = workout.workout_elements.findIndex((e) => e.id === workoutExercise.id);
            if (idx !== -1) {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              workout.workout_elements[idx] = {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                ...workout.workout_elements[idx]!,
                planned_sets: updatedSets,
              };
              break;
            }
          }
        }),
      );
      openSet(newIndex);
    } catch {
      toast.danger("Couldn't add set");
    }
  };

  const handleRemoveSet = async (setIndex: number) => {
    const updatedSets = workoutExercise.planned_sets.filter((_, i) => i !== setIndex);
    const cachePatch = dispatch(
      coachApi.util.updateQueryData('listWorkouts', {planId, limit: 100}, (draft) => {
        for (const workout of draft.data) {
          const idx = workout.workout_elements.findIndex((e) => e.id === workoutExercise.id);
          if (idx !== -1) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            workout.workout_elements[idx] = {...workout.workout_elements[idx]!, planned_sets: updatedSets};
            break;
          }
        }
      }),
    );
    try {
      await updateElement({
        id: workoutExercise.id,
        trainingWorkoutExerciseRequest: {planned_sets: updatedSets},
      }).unwrap();
    } catch {
      cachePatch.undo();
      toast.danger("Couldn't remove set");
    }
  };

  const exerciseName = workoutExercise.exercise?.name ?? '—';
  const trackingType = workoutExercise.exercise?.tracking_type ?? null;
  const canRemoveSet = workoutExercise.planned_sets.length > 1;

  return (
    <>
      {/* Exercise group: single 10px indent + 2px accent rule — no further nesting */}
      <div className="mt-2 border-l-2 border-accent pl-2.5">
        {/* Exercise name + reorder/remove controls */}
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-semibold text-foreground">{exerciseName}</span>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              aria-label="Move exercise up"
              className="rounded p-0.5 text-muted transition-colors hover:text-foreground disabled:opacity-30"
              disabled={isFirst}
              onClick={() => onMove(index, -1)}
              type="button"
            >
              <ChevronUp size={14} />
            </button>
            <button
              aria-label="Move exercise down"
              className="rounded p-0.5 text-muted transition-colors hover:text-foreground disabled:opacity-30"
              disabled={isLast}
              onClick={() => onMove(index, 1)}
              type="button"
            >
              <ChevronDown size={14} />
            </button>
            <button
              aria-label="Remove exercise"
              className="rounded p-0.5 text-muted transition-colors hover:text-danger"
              onClick={onRemove}
              type="button"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Set rows — full width within the group (no extra indent) */}
        {workoutExercise.planned_sets.map((set, i) => (
          <SetRow
            key={i}
            ref={(el) => {
              setButtonRefs.current[i] = el;
            }}
            canRemove={canRemoveSet}
            index={i}
            onRemove={() => {
              handleRemoveSet(i).catch(() => undefined);
            }}
            onTap={() => openSet(i)}
            set={set}
            trackingType={trackingType}
          />
        ))}

        {/* + set */}
        <button
          className="mt-1 text-xs text-accent hover:text-accent/80 transition-colors"
          onClick={handleAddSet}
          type="button"
        >
          + set
        </button>
      </div>

      {/* Set value sheet */}
      {sheetOpen ? (
        <SetSheet
          anchorEl={activeSetButtonRef.current}
          onClose={() => setSheetOpen(false)}
          onNext={
            activeSetIndex < workoutExercise.planned_sets.length - 1 ? () => setActiveSetIndex((i) => i + 1) : undefined
          }
          onPrev={activeSetIndex > 0 ? () => setActiveSetIndex((i) => i - 1) : undefined}
          open={sheetOpen}
          planId={planId}
          setIndex={activeSetIndex}
          workoutExercise={workoutExercise}
        />
      ) : null}
    </>
  );
}
