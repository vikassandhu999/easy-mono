/**
 * ExerciseRow — one exercise group inside the active workout card (badge TB).
 *
 * Header: exercise name · tracking-type chip · move up / move down / remove.
 * Body: the planned sets (SetList) behind a 2px accent rule, then `+ Add set`.
 *
 * GAPS.md #11: reordering is explicit up/down controls — no drag handles, no
 * DnD library.
 *
 * `+ Add set` duplicates the previous set and immediately opens the editor on
 * the new one (INTERACTIONS.md § TB).
 */
import {Button, Chip, Typography} from '@heroui/react';
import {ChevronDown, ChevronUp, X} from 'lucide-react';
import {useRef, useState} from 'react';

import {toastMutationError} from '@/@components/mutation-toast';
import type {TrainingPlanPlannedSet, TrainingPlanWorkoutExercise} from '@/api/generated';
import {coachApi, useUpdateWorkoutElementMutation} from '@/api/generated';
import {useAppDispatch} from '@/store';

import {SetList} from './set-row';
import {SetSheet} from './set-sheet';
import {trackingTypeLabel} from './tracking-fields';

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
  const [updateElement, {isLoading: isSavingSets}] = useUpdateWorkoutElementMutation();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeSetIndex, setActiveSetIndex] = useState(0);

  // Ref for the active set row — used as the desktop popover anchor
  const activeSetAnchorRef = useRef<HTMLElement | null>(null);
  const setRowRefs = useRef<(HTMLElement | null)[]>([]);
  const addSetButtonRef = useRef<HTMLButtonElement | null>(null);

  const openSet = (setIndex: number) => {
    // A just-added set has no rendered row yet (openSet fires before the cache
    // write re-renders), so fall back to the "+ Add set" button — otherwise the
    // desktop SetSheet loses its anchor and drops to a bottom sheet.
    activeSetAnchorRef.current = setRowRefs.current[setIndex] ?? addSetButtonRef.current ?? null;
    setActiveSetIndex(setIndex);
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
      // new row renders before any field edit.
      dispatch(
        coachApi.util.updateQueryData('listWorkouts', {planId, limit: 100}, (draft) => {
          for (const workout of draft.data) {
            const idx = workout.workout_elements.findIndex((e) => e.id === workoutExercise.id);
            if (idx !== -1) {
              workout.workout_elements[idx] = {
                ...workout.workout_elements[idx]!,
                planned_sets: updatedSets,
              };
              break;
            }
          }
        }),
      );
      openSet(newIndex);
    } catch (e) {
      toastMutationError(e, "Couldn't add set");
    }
  };

  const handleRemoveSet = async (setIndex: number) => {
    const updatedSets = workoutExercise.planned_sets.filter((_, i) => i !== setIndex);
    const cachePatch = dispatch(
      coachApi.util.updateQueryData('listWorkouts', {planId, limit: 100}, (draft) => {
        for (const workout of draft.data) {
          const idx = workout.workout_elements.findIndex((e) => e.id === workoutExercise.id);
          if (idx !== -1) {
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
    } catch (e) {
      cachePatch.undo();
      toastMutationError(e, "Couldn't remove set");
    }
  };

  const exerciseName = workoutExercise.exercise?.name ?? '—';
  const trackingType = workoutExercise.exercise?.tracking_type ?? null;
  const trackingLabel = trackingTypeLabel(trackingType);

  return (
    <>
      <div className="border-b border-separator py-2 last:border-0">
        {/* Exercise name + tracking chip + reorder/remove controls */}
        <div className="flex items-center gap-2">
          <Typography
            className="min-w-0 flex-1 truncate"
            type="body-sm"
            weight="semibold"
          >
            {exerciseName}
          </Typography>

          {trackingLabel ? (
            <Chip
              className="hidden shrink-0 rounded-chip border border-border bg-surface sm:flex"
              size="sm"
              variant="secondary"
            >
              {trackingLabel}
            </Chip>
          ) : null}

          <div className="flex shrink-0 items-center">
            <Button
              aria-label={`Move ${exerciseName} up`}
              className="size-11 min-w-11 text-muted"
              isDisabled={isFirst}
              isIconOnly
              onPress={() => onMove(index, -1)}
              variant="ghost"
            >
              <ChevronUp className="size-4" />
            </Button>
            <Button
              aria-label={`Move ${exerciseName} down`}
              className="size-11 min-w-11 text-muted"
              isDisabled={isLast}
              isIconOnly
              onPress={() => onMove(index, 1)}
              variant="ghost"
            >
              <ChevronDown className="size-4" />
            </Button>
            <Button
              aria-label={`Remove ${exerciseName}`}
              className="size-11 min-w-11 text-muted-2"
              isIconOnly
              onPress={onRemove}
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Sets — one 2px accent rule anchors the whole group */}
        <div className="border-l-2 border-accent pl-3">
          <SetList
            exerciseName={exerciseName}
            onOpenSet={openSet}
            onRemoveSet={(i) => {
              handleRemoveSet(i).catch(() => undefined);
            }}
            registerRowRef={(i, el) => {
              setRowRefs.current[i] = el;
            }}
            sets={workoutExercise.planned_sets}
            trackingType={trackingType}
          />

          {/* + Add set — disabled while a sets PATCH is in flight: a double-press
              would build two payloads from the same base and lose one add. */}
          <Button
            className="min-h-11 px-0 text-xs font-semibold text-accent"
            isDisabled={isSavingSets}
            onPress={() => {
              handleAddSet().catch(() => undefined);
            }}
            ref={addSetButtonRef}
            variant="ghost"
          >
            + Add set
          </Button>
        </div>
      </div>

      {/* Set value editor */}
      {sheetOpen ? (
        <SetSheet
          anchorEl={activeSetAnchorRef.current}
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
