import type {Ref} from 'react';

import {AlertDialog, Button, Input, Spinner, toast} from '@heroui/react';
import {Copy, Dumbbell, Pencil, Plus, Trash2} from 'lucide-react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import type {Exercise} from '@/api/exercises';
import type {PlannedWorkout, WorkoutElement} from '@/api/trainingPlans';

import {
  useCreatePlannedWorkoutMutation,
  useCreateWorkoutElementMutation,
  useDeletePlannedWorkoutMutation,
  useDeleteWorkoutElementMutation,
  useUpdatePlannedWorkoutMutation,
} from '@/api/trainingPlans';
import ExerciseElement from '@/training-plans/components/exercise-element';
import ExercisePicker from '@/training-plans/components/exercise-picker';
import SetSchemeInput, {
  buildPlannedSetsFromScheme,
  type SetSchemeValues,
} from '@/training-plans/components/set-scheme-input';

// ── Default set scheme (pre-filled from previous exercise or empty) ──

const EMPTY_SCHEME: SetSchemeValues = {sets: '3', reps: '', loadValue: '', loadUnit: 'kg', rest: ''};

function deriveSchemeFromLastElement(elements: WorkoutElement[]): SetSchemeValues {
  if (elements.length === 0) return EMPTY_SCHEME;
  const last = elements[elements.length - 1];
  if (!last || last.planned_sets.length === 0) return EMPTY_SCHEME;
  const firstSet = last.planned_sets[0];
  if (!firstSet) return EMPTY_SCHEME;
  return {
    sets: String(last.planned_sets.length),
    reps: '',
    loadValue: '',
    loadUnit: firstSet.load_unit ?? 'kg',
    rest: firstSet.rest_seconds != null ? String(firstSet.rest_seconds) : '',
  };
}

// ── Component ────────────────────────────────────────────────────────

type WorkoutSectionProps = {
  /** All workouts in the plan — needed for copy exercise target selection */
  allWorkouts: PlannedWorkout[];
  planId: string;
  /** Optional ref for scrolling to this section */
  sectionRef?: Ref<HTMLDivElement>;
  workout: PlannedWorkout;
};

export default function WorkoutSection({allWorkouts, planId, sectionRef, workout}: WorkoutSectionProps) {
  const [deleteWorkout, {isLoading: isDeletingWorkout}] = useDeletePlannedWorkoutMutation();
  const [createElement] = useCreateWorkoutElementMutation();
  const [deleteElement] = useDeleteWorkoutElementMutation();
  const [updateWorkout, {isLoading: isSavingName}] = useUpdatePlannedWorkoutMutation();
  const [createWorkout] = useCreatePlannedWorkoutMutation();

  // Track which exercise element is expanded (only one at a time)
  const [expandedElementId, setExpandedElementId] = useState<null | string>(null);

  // ── Inline workout name editing ────────────────────────────────

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(workout.name);

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditName(workout.name);
      setIsEditingName(false);
      return;
    }
    if (trimmed === workout.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await updateWorkout({id: workout.id, planId, body: {name: trimmed}}).unwrap();
      setIsEditingName(false);
    } catch {
      setEditName(workout.name);
      setIsEditingName(false);
      toast.danger('Failed to rename workout.');
    }
  };

  const nameInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.focus();
  }, []);

  // ── Delete workout ─────────────────────────────────────────────

  const handleDeleteWorkout = async () => {
    try {
      await deleteWorkout({id: workout.id, planId}).unwrap();
    } catch {
      toast.danger('Failed to delete workout');
    }
  };

  // ── Add exercise flow ──────────────────────────────────────────
  // Step 1: Coach picks exercise via ExercisePicker
  // Step 2: Set scheme input appears inline with pre-filled values
  // Step 3: Coach fills fields, taps "Add exercise"
  // Step 4: createElement with N identical working sets

  const [pendingExercise, setPendingExercise] = useState<Exercise | null>(null);
  const [addScheme, setAddScheme] = useState<SetSchemeValues>(EMPTY_SCHEME);
  const [isAddingExercise, setIsAddingExercise] = useState(false);

  const sortedElements = [...workout.workout_elements].sort((a, b) => a.position - b.position);

  const handlePickExercise = (exercise: Exercise) => {
    setPendingExercise(exercise);
    setAddScheme(deriveSchemeFromLastElement(sortedElements));
  };

  const handleConfirmAddExercise = async () => {
    if (!pendingExercise) return;
    const nextPosition =
      workout.workout_elements.length > 0 ? Math.max(...workout.workout_elements.map((e) => e.position)) + 1 : 0;
    const sets = buildPlannedSetsFromScheme(addScheme);
    setIsAddingExercise(true);
    try {
      await createElement({
        planId,
        plannedWorkoutId: workout.id,
        body: {
          exercise_id: pendingExercise.id,
          planned_workout_id: workout.id,
          position: nextPosition,
          planned_sets: sets,
        },
      }).unwrap();
      setPendingExercise(null);
      setAddScheme(EMPTY_SCHEME);
    } catch {
      toast.danger('Failed to add exercise');
    } finally {
      setIsAddingExercise(false);
    }
  };

  const handleCancelAdd = () => {
    setPendingExercise(null);
    setAddScheme(EMPTY_SCHEME);
  };

  // ── Undo toast for exercise removal ────────────────────────────
  // On remove: hide element, start 3s timer. On timeout: fire delete. On undo: restore.

  const [pendingRemoval, setPendingRemoval] = useState<null | WorkoutElement>(null);
  const removalTimerRef = useRef<null | ReturnType<typeof setTimeout>>(null);

  const handleRemoveExercise = (element: WorkoutElement) => {
    // If another removal is pending, commit it immediately
    if (pendingRemoval) {
      commitRemoval(pendingRemoval);
    }
    setPendingRemoval(element);
    const exerciseName = element.exercise?.name ?? 'Exercise';
    toast(`${exerciseName} removed`, {
      actionProps: {
        children: 'Undo',
        onPress: () => {
          setPendingRemoval(null);
          if (removalTimerRef.current) {
            clearTimeout(removalTimerRef.current);
            removalTimerRef.current = null;
          }
        },
        variant: 'tertiary',
      },
      timeout: 3000,
    });
    removalTimerRef.current = setTimeout(() => {
      commitRemoval(element);
    }, 3000);
  };

  const commitRemoval = (element: WorkoutElement) => {
    deleteElement({id: element.id, planId, plannedWorkoutId: workout.id})
      .unwrap()
      .catch(() => {
        toast.danger('Failed to remove exercise');
      });
    setPendingRemoval(null);
    removalTimerRef.current = null;
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (removalTimerRef.current) clearTimeout(removalTimerRef.current);
    };
  }, []);

  // Filter out pending removal from displayed elements
  const visibleElements = pendingRemoval ? sortedElements.filter((e) => e.id !== pendingRemoval.id) : sortedElements;

  const existingExerciseIds = useMemo(
    () => workout.workout_elements.map((e) => e.exercise_id),
    [workout.workout_elements],
  );

  // ── Copy workout (client-side) ─────────────────────────────────
  // Create a new workout with "(copy)" suffix, then create elements with same sets

  const [isCopyingWorkout, setIsCopyingWorkout] = useState(false);

  const handleCopyWorkout = async () => {
    const maxDay = allWorkouts.length > 0 ? Math.max(...allWorkouts.map((w) => w.day_number)) : 0;
    setIsCopyingWorkout(true);
    try {
      const newWorkout = await createWorkout({
        planId,
        body: {name: `${workout.name} (copy)`, day_number: maxDay + 1},
      }).unwrap();
      // Copy all elements with their sets
      for (const element of sortedElements) {
        await createElement({
          planId,
          plannedWorkoutId: newWorkout.data.id,
          body: {
            exercise_id: element.exercise_id,
            planned_workout_id: newWorkout.data.id,
            position: element.position,
            planned_sets: element.planned_sets,
          },
        }).unwrap();
      }
      toast.success(`${workout.name} copied`);
    } catch {
      toast.danger('Failed to copy workout. Some exercises may have been partially copied.');
    } finally {
      setIsCopyingWorkout(false);
    }
  };

  // ── Copy exercise to another workout ───────────────────────────

  const [copyingElementId, setCopyingElementId] = useState<null | string>(null);
  const otherWorkouts = allWorkouts.filter((w) => w.id !== workout.id);

  const handleCopyExercise = (element: WorkoutElement, targetWorkoutId: string) => {
    const targetWorkout = allWorkouts.find((w) => w.id === targetWorkoutId);
    const nextPosition = targetWorkout
      ? targetWorkout.workout_elements.length > 0
        ? Math.max(...targetWorkout.workout_elements.map((e) => e.position)) + 1
        : 0
      : 0;
    createElement({
      planId,
      plannedWorkoutId: targetWorkoutId,
      body: {
        exercise_id: element.exercise_id,
        planned_workout_id: targetWorkoutId,
        position: nextPosition,
        planned_sets: element.planned_sets,
      },
    })
      .unwrap()
      .then(() => {
        const exerciseName = element.exercise?.name ?? 'Exercise';
        const targetName = targetWorkout?.name ?? 'workout';
        toast.success(`${exerciseName} copied to ${targetName}`);
        setCopyingElementId(null);
      })
      .catch(() => {
        toast.danger('Failed to copy exercise');
        setCopyingElementId(null);
      });
  };

  // If only one other workout, copy directly. Otherwise show selector.
  const handleCopyExerciseStart = (element: WorkoutElement) => {
    if (otherWorkouts.length === 0) {
      // Same workout — duplicate in place
      handleCopyExercise(element, workout.id);
    } else if (otherWorkouts.length === 1) {
      handleCopyExercise(element, otherWorkouts[0]!.id);
    } else {
      setCopyingElementId(element.id);
    }
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div
      className="min-w-0 overflow-hidden rounded-xl border border-divider bg-content1 p-4"
      ref={sectionRef}
    >
      {/* Workout header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {isEditingName ? (
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-sm font-semibold text-foreground-400">Day {workout.day_number} —</span>
              <Input
                aria-label="Workout name"
                className="max-w-[200px]"
                onBlur={handleSaveName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                  if (e.key === 'Escape') {
                    setEditName(workout.name);
                    setIsEditingName(false);
                  }
                }}
                ref={nameInputRef}
                value={editName}
              />
              {isSavingName && <Spinner size="sm" />}
            </div>
          ) : (
            <button
              className="flex min-h-11 min-w-0 items-center gap-1.5 rounded-md px-1 text-left transition-colors hover:bg-content2"
              onClick={() => {
                setEditName(workout.name);
                setIsEditingName(true);
              }}
              type="button"
            >
              <h3 className="truncate text-sm font-semibold">
                Day {workout.day_number} — {workout.name}
              </h3>
              <Pencil
                className="shrink-0 text-foreground-400"
                size={12}
              />
            </button>
          )}
          {workout.notes && !isEditingName && (
            <p className="mt-0.5 truncate px-1 text-xs text-foreground-400">{workout.notes}</p>
          )}
        </div>

        {/* Header actions: copy workout + delete workout */}
        <div className="flex shrink-0 gap-1">
          <Button
            aria-label="Copy workout"
            isIconOnly
            isPending={isCopyingWorkout}
            onPress={handleCopyWorkout}
            size="sm"
            variant="ghost"
          >
            <Copy size={14} />
          </Button>
          <AlertDialog>
            <Button
              aria-label="Delete workout"
              isIconOnly
              size="sm"
              variant="ghost"
            >
              <Trash2 size={14} />
            </Button>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog className="sm:max-w-[400px]">
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="danger" />
                    <AlertDialog.Heading>Delete workout?</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p>
                      This will permanently delete <strong>{workout.name}</strong> and all{' '}
                      {workout.workout_elements.length} exercise
                      {workout.workout_elements.length !== 1 ? 's' : ''}. This action cannot be undone.
                    </p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button
                      slot="close"
                      variant="tertiary"
                    >
                      Cancel
                    </Button>
                    <Button
                      isPending={isDeletingWorkout}
                      onPress={handleDeleteWorkout}
                      variant="danger"
                    >
                      {isDeletingWorkout ? 'Deleting...' : 'Delete'}
                    </Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        </div>
      </div>

      {/* Exercise elements */}
      {visibleElements.length > 0 ? (
        <div className="mb-3 flex flex-col gap-1">
          {visibleElements.map((element) => (
            <div key={element.id}>
              <ExerciseElement
                element={element}
                isExpanded={expandedElementId === element.id}
                onCopy={() => handleCopyExerciseStart(element)}
                onRemove={() => handleRemoveExercise(element)}
                onToggleExpand={() => setExpandedElementId(expandedElementId === element.id ? null : element.id)}
                planId={planId}
              />
              {/* Copy exercise target selector */}
              {copyingElementId === element.id && otherWorkouts.length > 1 && (
                <div className="mt-1 flex flex-wrap gap-1 rounded-lg border border-dashed border-divider p-2">
                  <span className="w-full text-xs text-foreground-400">Copy to:</span>
                  {otherWorkouts.map((w) => (
                    <Button
                      key={w.id}
                      onPress={() => handleCopyExercise(element, w.id)}
                      size="sm"
                      variant="secondary"
                    >
                      Day {w.day_number} — {w.name}
                    </Button>
                  ))}
                  <Button
                    onPress={() => setCopyingElementId(null)}
                    size="sm"
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-xs text-foreground-400">No exercises yet. Add an exercise below.</p>
      )}

      {/* Add exercise flow: picker → set scheme → confirm */}
      {pendingExercise ? (
        <div className="rounded-lg border border-dashed border-divider p-3">
          <div className="mb-2 flex items-center gap-2">
            <Dumbbell
              className="shrink-0 text-foreground-400"
              size={14}
            />
            <p className="text-sm font-medium">{pendingExercise.name}</p>
            {pendingExercise.mechanics && (
              <span className="text-xs text-foreground-400">{pendingExercise.mechanics}</span>
            )}
          </div>
          <SetSchemeInput
            onChange={setAddScheme}
            showPresets
            values={addScheme}
          />
          <div className="mt-2 flex gap-2">
            <Button
              isPending={isAddingExercise}
              onPress={handleConfirmAddExercise}
              size="sm"
            >
              <Plus size={14} />
              {isAddingExercise ? 'Adding...' : 'Add exercise'}
            </Button>
            <Button
              onPress={handleCancelAdd}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <ExercisePicker
          excludeIds={existingExerciseIds}
          onSelect={handlePickExercise}
        />
      )}
    </div>
  );
}
