/**
 * ExerciseRow — one exercise group inside a workout card.
 *
 * Width discipline: ONE 10px left indent anchored by a 2px accent rule
 * (#6c8cff). Set rows and the "+ set" button sit flush within that group —
 * no additional nesting or padding per level.
 *
 * "+ set" appends a default working set via PATCH planned_sets, then opens
 * the SetSheet on the new set.
 */
import {useRef, useState} from 'react';
import {useDispatch} from 'react-redux';

import {api} from '@/api/base';
import type {TrainingPlanPlannedSet, TrainingPlanWorkoutExercise} from '@/api/generated';
import {useUpdateWorkoutElementMutation} from '@/api/generated';

import {SetRow} from './set-row';
import {SetSheet} from './set-sheet';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExerciseRowProps {
  workoutExercise: TrainingPlanWorkoutExercise;
  planId: string;
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
    distance_unit: 'none',
    rpe: null,
    rest_seconds: null,
    notes: null,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExerciseRow({workoutExercise, planId}: ExerciseRowProps) {
  const dispatch = useDispatch();
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
    const newSet = makeDefaultSet();
    const updatedSets = [...workoutExercise.planned_sets, newSet];
    const newIndex = updatedSets.length - 1;

    try {
      await updateElement({
        id: workoutExercise.id,
        trainingWorkoutExerciseRequest: {planned_sets: updatedSets},
      }).unwrap();
      // Reflect the appended set in the listWorkouts cache immediately so the
      // new SetRow renders before any field edit.
      dispatch(
        api.util.updateQueryData('listWorkouts', {planId}, (draft) => {
          for (const workout of draft.data) {
            const idx = workout.workout_elements.findIndex((e) => e.id === workoutExercise.id);
            if (idx !== -1) {
              workout.workout_elements[idx] = {
                ...workout.workout_elements[idx],
                planned_sets: updatedSets,
              };
              break;
            }
          }
        }),
      );
      openSet(newIndex);
    } catch {
      // Add failed — don't open sheet
    }
  };

  const exerciseName = workoutExercise.exercise?.name ?? '—';

  return (
    <>
      {/* Exercise group: single 10px indent + 2px accent rule — no further nesting */}
      <div
        className="mt-2 pl-2.5"
        style={{borderLeft: '2px solid #6c8cff'}}
      >
        {/* Exercise name */}
        <div className="mb-1 text-sm font-semibold text-foreground">{exerciseName}</div>

        {/* Set rows — full width within the group (no extra indent) */}
        {workoutExercise.planned_sets.map((set, i) => (
          <div
            key={i}
            ref={(el) => {
              setButtonRefs.current[i] = el?.querySelector('button') ?? null;
            }}
          >
            <SetRow
              index={i}
              onTap={() => openSet(i)}
              set={set}
            />
          </div>
        ))}

        {/* + set */}
        <button
          className="mt-1 text-xs text-primary hover:text-primary/80 transition-colors"
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
