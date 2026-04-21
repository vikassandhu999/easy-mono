import type {Ref} from 'react';

import {formatUsedOnDays, getWorkoutUsedOnDays, TRAINING_DAY_LABELS} from '@easy/utils';
import {AlertDialog, Button, Input, Spinner, toast} from '@heroui/react';
import {Copy, Dumbbell, Pencil, Plus, Trash2} from 'lucide-react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import type {Exercise} from '@/api/exercises';
import type {TrainingPlanItem, Workout, WorkoutElement} from '@/api/trainingPlans';

import {
  useCreateTrainingPlanItemMutation,
  useCreateWorkoutElementMutation,
  useDeleteTrainingPlanItemMutation,
  useDeleteWorkoutElementMutation,
  useDeleteWorkoutMutation,
  useDuplicateWorkoutMutation,
  useUpdateWorkoutElementMutation,
  useUpdateWorkoutMutation,
} from '@/api/trainingPlans';
import ExerciseElement from '@/training-plans/components/exercise-element';
import ExercisePicker from '@/training-plans/components/exercise-picker';
import SetSchemeInput, {
  buildPlannedSetsFromScheme,
  type SetSchemeValues,
} from '@/training-plans/components/set-scheme-input';

// ── Default set scheme (pre-filled from previous exercise or empty) ──

const EMPTY_SCHEME: SetSchemeValues = {sets: '3', reps: '', loadValue: '', loadUnit: 'kg', rest: '', warmupSets: ''};

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
    warmupSets: '',
  };
}

// ── Component ────────────────────────────────────────────────────────

type WorkoutSectionProps = {
  /** All workouts in the plan — needed for copy exercise target selection */
  allWorkouts: Workout[];
  onWorkoutCreated?: (workoutId: string) => void;
  planId: string;
  planItems: TrainingPlanItem[];
  /** Optional ref for scrolling to this section */
  sectionRef?: Ref<HTMLDivElement>;
  workout: Workout;
};

export default function WorkoutSection({
  allWorkouts,
  onWorkoutCreated,
  planId,
  planItems,
  sectionRef,
  workout,
}: WorkoutSectionProps) {
  const [deleteWorkout, {isLoading: isDeletingWorkout}] = useDeleteWorkoutMutation();
  const [createElement] = useCreateWorkoutElementMutation();
  const [deleteElement] = useDeleteWorkoutElementMutation();
  const [updateWorkout, {isLoading: isSavingName}] = useUpdateWorkoutMutation();
  const [duplicateWorkout, {isLoading: isDuplicatingWorkout}] = useDuplicateWorkoutMutation();
  const [updateElement] = useUpdateWorkoutElementMutation();
  const [createPlanItem, {isLoading: isCreatingPlanItem}] = useCreateTrainingPlanItemMutation();
  const [deletePlanItem, {isLoading: isDeletingPlanItem}] = useDeleteTrainingPlanItemMutation();

  // Track which exercise element is expanded (only one at a time)
  const [expandedElementId, setExpandedElementId] = useState<null | string>(null);

  // ── Inline workout name editing ────────────────────────────────

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(workout.name);
  const usedOnDays = useMemo(() => getWorkoutUsedOnDays(planItems, workout.id), [planItems, workout.id]);
  const usedOnLabel = useMemo(
    () => (usedOnDays.length === 0 ? 'Not scheduled yet' : `Used on: ${formatUsedOnDays(usedOnDays)}`),
    [usedOnDays],
  );
  const isShared = usedOnDays.length > 1;

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

  // ── Inline workout notes editing ────────────────────────────────

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editNotes, setEditNotes] = useState(workout.notes ?? '');

  const handleSaveNotes = async () => {
    const trimmed = editNotes.trim();
    const current = workout.notes ?? '';
    if (trimmed === current) {
      setIsEditingNotes(false);
      return;
    }
    try {
      await updateWorkout({id: workout.id, planId, body: {notes: trimmed || null}}).unwrap();
      setIsEditingNotes(false);
    } catch {
      setEditNotes(workout.notes ?? '');
      setIsEditingNotes(false);
      toast.danger('Failed to update notes.');
    }
  };

  const notesInputRef = useCallback((node: HTMLInputElement | null) => {
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
        workoutId: workout.id,
        body: {
          exercise_id: pendingExercise.id,
          workout_id: workout.id,
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
    if (removalTimerRef.current) {
      clearTimeout(removalTimerRef.current);
      removalTimerRef.current = null;
    }

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
    deleteElement({id: element.id, planId, workoutId: workout.id})
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

  // ── Reorder exercises (move up/down) ───────────────────────────

  const handleMoveExercise = async (index: number, direction: 'down' | 'up') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const current = visibleElements[index];
    const target = visibleElements[targetIndex];
    if (!current || !target) return;
    try {
      await Promise.all([
        updateElement({
          id: current.id,
          planId,
          workoutId: workout.id,
          body: {position: target.position},
        }).unwrap(),
        updateElement({
          id: target.id,
          planId,
          workoutId: workout.id,
          body: {position: current.position},
        }).unwrap(),
      ]);
    } catch {
      toast.danger('Failed to reorder exercise');
    }
  };

  // ── Duplicate exercise (same exercise + sets in same workout) ───

  const handleDuplicateExercise = (element: WorkoutElement) => {
    const nextPosition =
      workout.workout_elements.length > 0 ? Math.max(...workout.workout_elements.map((e) => e.position)) + 1 : 0;
    createElement({
      planId,
      workoutId: workout.id,
      body: {
        exercise_id: element.exercise_id,
        workout_id: workout.id,
        position: nextPosition,
        planned_sets: element.planned_sets,
        ...(element.notes && {notes: element.notes}),
      },
    })
      .unwrap()
      .then(() => {
        const name = element.exercise?.name ?? 'Exercise';
        toast.success(`Duplicated ${name}`);
      })
      .catch(() => {
        toast.danger('Failed to duplicate exercise');
      });
  };

  const existingExerciseIds = useMemo(
    () => workout.workout_elements.map((e) => e.exercise_id),
    [workout.workout_elements],
  );

  const handleDuplicateWorkout = async () => {
    try {
      const result = await duplicateWorkout({id: workout.id, planId}).unwrap();
      toast.success(`Duplicated ${workout.name}`);
      onWorkoutCreated?.(result.data.id);
    } catch {
      toast.danger('Failed to duplicate workout');
    }
  };

  // ── Unshare: "Make a copy for this day only" ───────────────────
  //
  // Backend limitation (see docs/2026-04-21-training-plan-redesign-handover.md
  // "Open questions"): `PATCH /training_plan_items/{id}` does not apply
  // `workout_id`. To relink a plan item to a different workout we delete + recreate.
  //
  // Flow:
  //   1. Duplicate the current workout (deep-copies exercises + sets)
  //   2. Delete the plan item for the chosen day
  //   3. Create a new plan item for that day pointing at the duplicate
  //
  // If step 2 succeeds but step 3 fails, the day ends up unassigned — surface an
  // error toast so the coach can retry from the day row.

  const [unsharePickerOpen, setUnsharePickerOpen] = useState(false);
  const [unshareDay, setUnshareDay] = useState<(typeof usedOnDays)[number] | null>(null);
  const isUnshareInFlight = isDuplicatingWorkout || isCreatingPlanItem || isDeletingPlanItem;

  const handleUnshareForDay = async (day: (typeof usedOnDays)[number]) => {
    setUnshareDay(day);
    const planItem = planItems.find((item) => item.workout_id === workout.id && item.day === day);
    if (!planItem) {
      toast.danger('Could not find the day assignment to unshare.');
      setUnshareDay(null);
      return;
    }

    try {
      const dup = await duplicateWorkout({id: workout.id, planId}).unwrap();
      try {
        await deletePlanItem({id: planItem.id, planId}).unwrap();
      } catch {
        toast.danger('Created a copy but failed to replace the day assignment. Please update manually.');
        setUnshareDay(null);
        setUnsharePickerOpen(false);
        return;
      }

      try {
        await createPlanItem({
          planId,
          body: {
            day,
            workout_id: dup.data.id,
            workout_type: planItem.workout_type,
          },
        }).unwrap();
        toast.success(`${TRAINING_DAY_LABELS[day]} now uses its own copy of this workout.`);
        onWorkoutCreated?.(dup.data.id);
      } catch {
        toast.danger(
          `Created a copy but ${TRAINING_DAY_LABELS[day]} is now unassigned. Assign the new workout manually.`,
        );
      }
    } catch {
      toast.danger('Failed to create a copy for this day.');
    } finally {
      setUnshareDay(null);
      setUnsharePickerOpen(false);
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
      workoutId: targetWorkoutId,
      body: {
        exercise_id: element.exercise_id,
        workout_id: targetWorkoutId,
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
              <Input
                aria-label="Workout name"
                className="max-w-[240px]"
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
              <h3 className="truncate text-sm font-semibold">{workout.name}</h3>
              <Pencil
                className="shrink-0 text-foreground-400"
                size={12}
              />
            </button>
          )}
          <p className="mt-1 px-1 text-xs text-foreground-400">{usedOnLabel}</p>
          {isShared ? (
            <SharedWorkoutBanner
              busyDay={unshareDay}
              isBusy={isUnshareInFlight}
              isPickerOpen={unsharePickerOpen}
              onClosePicker={() => setUnsharePickerOpen(false)}
              onOpenPicker={() => setUnsharePickerOpen(true)}
              onUnshareDay={handleUnshareForDay}
              usedOnDays={usedOnDays}
            />
          ) : null}
          {!isEditingName &&
            (isEditingNotes ? (
              <div className="mt-1 flex items-center gap-2 px-1">
                <Input
                  aria-label="Workout notes"
                  className="flex-1"
                  onBlur={handleSaveNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                    if (e.key === 'Escape') {
                      setEditNotes(workout.notes ?? '');
                      setIsEditingNotes(false);
                    }
                  }}
                  placeholder="Add notes..."
                  ref={notesInputRef}
                  value={editNotes}
                />
              </div>
            ) : (
              <button
                className="mt-0.5 flex min-h-11 items-center rounded-md px-1 text-left text-xs text-foreground-400 transition-colors hover:bg-content2"
                onClick={() => {
                  setEditNotes(workout.notes ?? '');
                  setIsEditingNotes(true);
                }}
                type="button"
              >
                {workout.notes || 'Add notes...'}
              </button>
            ))}
        </div>

        {/* Header actions: copy workout + delete workout */}
        <div className="flex shrink-0 gap-1">
          <Button
            aria-label="Duplicate workout"
            isIconOnly
            isPending={isDuplicatingWorkout}
            onPress={handleDuplicateWorkout}
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
          {visibleElements.map((element, index) => (
            <div key={element.id}>
              <ExerciseElement
                element={element}
                isExpanded={expandedElementId === element.id}
                onCopy={() => handleCopyExerciseStart(element)}
                onDuplicate={() => handleDuplicateExercise(element)}
                onMoveDown={index < visibleElements.length - 1 ? () => handleMoveExercise(index, 'down') : undefined}
                onMoveUp={index > 0 ? () => handleMoveExercise(index, 'up') : undefined}
                onRemove={() => handleRemoveExercise(element)}
                onToggleExpand={() => setExpandedElementId(expandedElementId === element.id ? null : element.id)}
                planId={planId}
              />
              {/* Copy exercise target selector */}
              {copyingElementId === element.id && otherWorkouts.length > 1 && (
                <div className="mt-1 flex flex-wrap gap-1 rounded-lg border border-dashed border-divider p-2">
                  <span className="w-full text-xs text-foreground-400">Copy to:</span>
                  {otherWorkouts.map((w) => {
                    const wDays = getWorkoutUsedOnDays(planItems, w.id);
                    const wUsage = formatUsedOnDays(wDays);
                    return (
                      <Button
                        key={w.id}
                        onPress={() => handleCopyExercise(element, w.id)}
                        size="sm"
                        variant="secondary"
                      >
                        {w.name}
                        {wDays.length > 0 ? ` · ${wUsage}` : ''}
                      </Button>
                    );
                  })}
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

// ── Shared workout banner ──────────────────────────────────────
//
// Surfaced on every shared Workout card. Purpose:
//   1. Make it obvious that edits propagate (the "Used on: Mon, Thu" copy isn't
//      enough — coaches miss it).
//   2. Offer the spec's "Make a copy for this day only" escape hatch inline,
//      so a coach who wants divergence doesn't have to leave the card.

type TrainingWeekdayLite = keyof typeof TRAINING_DAY_LABELS;

function SharedWorkoutBanner({
  busyDay,
  isBusy,
  isPickerOpen,
  onClosePicker,
  onOpenPicker,
  onUnshareDay,
  usedOnDays,
}: {
  /** Day currently being unshared (used to target the spinner on one button). */
  busyDay: null | TrainingWeekdayLite;
  /** Any of the three unshare mutations in flight. */
  isBusy: boolean;
  isPickerOpen: boolean;
  onClosePicker: () => void;
  onOpenPicker: () => void;
  onUnshareDay: (day: TrainingWeekdayLite) => Promise<void>;
  usedOnDays: TrainingWeekdayLite[];
}) {
  const daysLabel = usedOnDays.map((day) => TRAINING_DAY_LABELS[day]).join(', ');

  return (
    <div className="mt-1 rounded-md border border-warning/30 bg-warning/5 px-2 py-2 text-xs">
      <p className="text-foreground-600">
        <span className="font-medium">Shared workout.</span> Edits apply to {daysLabel}.
      </p>
      {isPickerOpen ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-foreground-500">Make a copy just for:</span>
          {usedOnDays.map((day) => (
            <Button
              isDisabled={isBusy}
              isPending={busyDay === day}
              key={day}
              onPress={() => {
                onUnshareDay(day).catch(() => {
                  /* handled inside onUnshareDay */
                });
              }}
              size="sm"
              variant="secondary"
            >
              {TRAINING_DAY_LABELS[day]}
            </Button>
          ))}
          <Button
            isDisabled={isBusy}
            onPress={onClosePicker}
            size="sm"
            variant="ghost"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          className="mt-2"
          onPress={onOpenPicker}
          size="sm"
          variant="ghost"
        >
          Make a copy for one day only
        </Button>
      )}
    </div>
  );
}
