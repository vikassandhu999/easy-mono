import type {Ref} from 'react';

import {formatUsedOnDays, getWorkoutUsedOnDays} from '@easy/utils';
import {
  AlertDialog,
  Button,
  FieldError,
  Form,
  Input,
  Label,
  Popover,
  TextField,
  toast,
  Typography,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {MoreHorizontal, Plus} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';

import type {Exercise} from '@/api/exercises';
import type {TrainingPlanItem, Workout, WorkoutElement} from '@/api/trainingPlans';
import type {LoadUnitValue} from '@/training-plans/components/unit-picker';

import {
  useCreateWorkoutElementMutation,
  useDeleteWorkoutElementMutation,
  useDeleteWorkoutMutation,
  useDuplicateWorkoutMutation,
  useUpdateWorkoutMutation,
} from '@/api/trainingPlans';
import ExerciseElement from '@/training-plans/components/exercise-element';
import ExercisePicker from '@/training-plans/components/exercise-picker';
import InlineExerciseForm, {
  buildPlannedSetsFromForm,
  EMPTY_DEFAULTS,
  type InlineExerciseFormValues,
} from '@/training-plans/components/inline-exercise-form';

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
  const [createElement, {isLoading: isCreatingElement}] = useCreateWorkoutElementMutation();
  const [deleteElement] = useDeleteWorkoutElementMutation();
  const [updateWorkout, {isLoading: isSavingName}] = useUpdateWorkoutMutation();
  const [duplicateWorkout, {isLoading: isDuplicatingWorkout}] = useDuplicateWorkoutMutation();

  // Track which exercise row is in edit mode (only one at a time).
  const [editingElementId, setEditingElementId] = useState<null | string>(null);

  // Add-flow state: the exercise picked from ExercisePicker, before the coach
  // confirms the set scheme. null = no add flow in progress.
  const [pendingExercise, setPendingExercise] = useState<Exercise | null>(null);

  // Session-level load unit memory (Task 7). Seeded from business settings
  // (not yet exposed in API); falls back to 'kg'. Sticks after the coach
  // manually picks a different unit in any exercise form.
  const [sessionLoadUnit, setSessionLoadUnit] = useState<LoadUnitValue>('kg');

  const [isEditingName, setIsEditingName] = useState(false);
  const [isWorkoutMenuOpen, setIsWorkoutMenuOpen] = useState(false);
  const [showDeleteWorkoutDialog, setShowDeleteWorkoutDialog] = useState(false);
  const usedOnDays = useMemo(() => getWorkoutUsedOnDays(planItems, workout.id), [planItems, workout.id]);
  const usedOnLabel = useMemo(
    () => (usedOnDays.length === 0 ? 'Not scheduled yet' : `Used on: ${formatUsedOnDays(usedOnDays)}`),
    [usedOnDays],
  );

  const handleSaveName = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === workout.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await updateWorkout({id: workout.id, planId, body: {name: trimmed}}).unwrap();
      setIsEditingName(false);
    } catch {
      setIsEditingName(false);
      toast.danger('Failed to rename workout.');
    }
  };

  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const handleSaveNotes = async (notes: string) => {
    const trimmed = notes.trim();
    const current = workout.notes ?? '';
    if (trimmed === current) {
      setIsEditingNotes(false);
      return;
    }
    try {
      await updateWorkout({id: workout.id, planId, body: {notes: trimmed || null}}).unwrap();
      setIsEditingNotes(false);
    } catch {
      setIsEditingNotes(false);
      toast.danger('Failed to update notes.');
    }
  };

  const handleDeleteWorkout = async () => {
    try {
      await deleteWorkout({id: workout.id, planId}).unwrap();
    } catch {
      toast.danger('Failed to delete workout');
    }
  };

  // Two-step inline flow (never leaves the workout page):
  //   1. Coach taps `+ Add exercise` → picker renders in place.
  //   2. Coach picks an exercise → InlineExerciseForm renders in place with
  //      chips-then-fields layout, Cancel / Add actions.
  // On Add, the form posts and the UI returns to the `+ Add exercise` button.

  const sortedElements = [...workout.workout_elements].sort((a, b) => a.position - b.position);
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);

  const handleStartAdd = () => {
    setIsAddPickerOpen(true);
  };

  const handlePickExercise = (exercise: Exercise) => {
    setPendingExercise(exercise);
    setIsAddPickerOpen(false);
  };

  const handleCancelAdd = () => {
    setPendingExercise(null);
    setIsAddPickerOpen(false);
  };

  const handleSubmitAdd = async (values: InlineExerciseFormValues) => {
    if (!pendingExercise) return;
    const nextPosition =
      workout.workout_elements.length > 0 ? Math.max(...workout.workout_elements.map((e) => e.position)) + 1 : 0;
    const plannedSets = buildPlannedSetsFromForm(values);
    const trimmedNotes = values.exerciseNotes.trim();
    await createElement({
      planId,
      workoutId: workout.id,
      body: {
        exercise_id: pendingExercise.id,
        workout_id: workout.id,
        position: nextPosition,
        planned_sets: plannedSets,
        ...(trimmedNotes && {notes: trimmedNotes}),
      },
    }).unwrap();
    setPendingExercise(null);
    setIsAddPickerOpen(false);
  };

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

  const handleDuplicateWorkout = async () => {
    try {
      const result = await duplicateWorkout({id: workout.id, planId}).unwrap();
      toast.success(`Duplicated ${workout.name}`);
      onWorkoutCreated?.(result.data.id);
    } catch {
      toast.danger('Failed to duplicate workout');
    }
  };

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
        ...(element.notes != null && {notes: element.notes}),
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

  return (
    <div
      className="min-w-0 scroll-mt-20 overflow-hidden rounded-xl border border-divider bg-content1 p-4"
      id={`workout-${workout.id}`}
      ref={sectionRef}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {isEditingName ? (
            <WorkoutTextForm
              ariaLabel="Workout name"
              defaultValue={workout.name}
              isSubmitting={isSavingName}
              onCancel={() => setIsEditingName(false)}
              onSubmit={handleSaveName}
            />
          ) : (
            <Button
              className="flex min-h-11 min-w-0 items-center rounded-md px-1 text-left transition-colors hover:bg-content2"
              onPress={() => {
                setIsEditingNotes(false);
                setIsEditingName(true);
              }}
              variant="ghost"
            >
              <Typography
                className="truncate"
                type="body-sm"
                weight="semibold"
              >
                {workout.name}
              </Typography>
            </Button>
          )}
          <Typography
            className="mt-1 px-1"
            color="muted"
            type="body-xs"
          >
            {usedOnLabel}
          </Typography>
          {!isEditingName && isEditingNotes ? (
            <div className="mt-1 px-1">
              <WorkoutTextForm
                ariaLabel="Workout notes"
                defaultValue={workout.notes ?? ''}
                onCancel={() => setIsEditingNotes(false)}
                onSubmit={handleSaveNotes}
                placeholder="Add notes"
              />
            </div>
          ) : !isEditingName && workout.notes ? (
            <Button
              className="mt-0.5 flex min-h-11 items-center rounded-md px-1 text-left text-xs text-foreground-400 transition-colors hover:bg-content2"
              onPress={() => {
                setEditNotes(workout.notes ?? '');
                setIsEditingName(false);
                setIsEditingNotes(true);
              }}
              variant="ghost"
            >
              {workout.notes}
            </Button>
          ) : null}
        </div>

        {/* Header actions are tucked behind one menu to keep the builder calm. */}
        <Popover
          isOpen={isWorkoutMenuOpen}
          onOpenChange={setIsWorkoutMenuOpen}
        >
          <Popover.Trigger>
            <Button
              aria-label={`Actions for ${workout.name}`}
              className="min-h-11 min-w-11 shrink-0"
              isIconOnly
              isPending={isDuplicatingWorkout || isDeletingWorkout}
              size="sm"
              variant="ghost"
            >
              <MoreHorizontal size={18} />
            </Button>
          </Popover.Trigger>
          <Popover.Content
            className="min-w-[220px] p-1"
            placement="bottom end"
          >
            <Popover.Dialog className="outline-none">
              <WorkoutActionItem
                onSelect={() => {
                  setIsWorkoutMenuOpen(false);
                  setIsEditingNotes(false);
                  setIsEditingName(true);
                }}
              >
                Rename
              </WorkoutActionItem>
              <WorkoutActionItem
                onSelect={() => {
                  setIsWorkoutMenuOpen(false);
                  setIsEditingName(false);
                  setIsEditingNotes(true);
                }}
              >
                {workout.notes ? 'Edit notes' : 'Add notes'}
              </WorkoutActionItem>
              <WorkoutActionItem
                isPending={isDuplicatingWorkout}
                onSelect={async () => {
                  setIsWorkoutMenuOpen(false);
                  await handleDuplicateWorkout();
                }}
              >
                Duplicate workout
              </WorkoutActionItem>
              <div className="my-1 h-px bg-divider" />
              <WorkoutActionItem
                isDanger
                onSelect={() => {
                  setIsWorkoutMenuOpen(false);
                  setShowDeleteWorkoutDialog(true);
                }}
              >
                Delete workout
              </WorkoutActionItem>
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      </div>

      {showDeleteWorkoutDialog ? (
        <DeleteWorkoutDialog
          exerciseCount={workout.workout_elements.length}
          isDeleting={isDeletingWorkout}
          onCancel={() => setShowDeleteWorkoutDialog(false)}
          onConfirm={async () => {
            await handleDeleteWorkout();
            setShowDeleteWorkoutDialog(false);
          }}
          workoutName={workout.name}
        />
      ) : null}

      {visibleElements.length > 0 ? (
        <div className="mb-3 flex flex-col gap-1">
          {visibleElements.map((element) => (
            <div key={element.id}>
              <ExerciseElement
                element={element}
                fallbackLoadUnit={sessionLoadUnit}
                isEditing={editingElementId === element.id}
                onCancel={() => setEditingElementId(null)}
                onCopy={() => handleCopyExerciseStart(element)}
                onDuplicate={() => handleDuplicateExercise(element)}
                onLoadUnitChange={setSessionLoadUnit}
                onRemove={() => handleRemoveExercise(element)}
                onStartEditing={() => {
                  // Only one row edits at a time. Starting edit also cancels
                  // any in-flight add flow.
                  setEditingElementId(element.id);
                  setIsAddPickerOpen(false);
                  setPendingExercise(null);
                }}
                planId={planId}
              />
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
      ) : !isAddPickerOpen && !pendingExercise ? (
        <p className="mb-3 text-xs text-foreground-400">No exercises yet. Add an exercise below.</p>
      ) : null}

      {/* Add exercise — inline flow. States:
          1. Editing an existing row → button hidden (only one form at a time)
          2. Picking  → ExercisePicker (autocomplete) with Cancel
          3. Filling  → InlineExerciseForm with chips + fields
          4. Idle     → `+ Add exercise` button */}
      {pendingExercise ? (
        <InlineExerciseForm
          actionLabel="Add"
          defaultValues={{...EMPTY_DEFAULTS, loadUnit: sessionLoadUnit}}
          exerciseName={pendingExercise.name}
          isSubmitting={isCreatingElement}
          onCancel={handleCancelAdd}
          onLoadUnitChange={setSessionLoadUnit}
          onSubmit={handleSubmitAdd}
        />
      ) : isAddPickerOpen ? (
        <div className="flex flex-col gap-2">
          <ExercisePicker
            excludeIds={workout.workout_elements.map((e) => e.exercise_id)}
            onSelect={handlePickExercise}
          />
          <Button
            className="self-start"
            onPress={handleCancelAdd}
            size="sm"
            variant="ghost"
          >
            Cancel
          </Button>
        </div>
      ) : editingElementId ? null : (
        <Button
          className="w-full sm:w-auto"
          onPress={handleStartAdd}
          variant="secondary"
        >
          <Plus size={16} />
          Add exercise
        </Button>
      )}
    </div>
  );
}

const workoutTextFormSchema = z.object({
  value: z.string(),
});

type WorkoutTextFormValues = z.infer<typeof workoutTextFormSchema>;

function WorkoutTextForm({
  ariaLabel,
  defaultValue,
  isSubmitting,
  onCancel,
  onSubmit,
  placeholder,
}: {
  ariaLabel: string;
  defaultValue: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (value: string) => Promise<void> | void;
  placeholder?: string;
}) {
  const form = useForm<WorkoutTextFormValues>({
    defaultValues: {value: defaultValue},
    resolver: zodResolver(workoutTextFormSchema),
  });

  const handleSubmit = form.handleSubmit(async ({value}) => {
    await onSubmit(value);
  });

  return (
    <Form
      className="flex min-w-0 flex-1 flex-col gap-1"
      onSubmit={handleSubmit}
    >
      <Controller
        control={form.control}
        name="value"
        render={({field}) => (
          <TextField
            aria-label={ariaLabel}
            className="max-w-[240px]"
            isInvalid={!!form.formState.errors.value}
            name={field.name}
            onBlur={() => {
              field.onBlur();
              handleSubmit().catch(() => undefined);
            }}
            onChange={field.onChange}
            value={field.value}
          >
            <Label className="sr-only">{ariaLabel}</Label>
            {form.formState.errors.value && <FieldError>{form.formState.errors.value.message}</FieldError>}
            <Input
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
                if (event.key === 'Escape' && !isSubmitting) {
                  onCancel();
                }
              }}
              placeholder={placeholder}
              ref={(node) => {
                node?.focus();
              }}
            />
          </TextField>
        )}
      />
    </Form>
  );
}

function WorkoutActionItem({
  children,
  isDanger,
  isPending,
  onSelect,
}: {
  children: React.ReactNode;
  isDanger?: boolean;
  isPending?: boolean;
  onSelect: () => void;
}) {
  return (
    <Button
      className={[
        'flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors',
        'hover:bg-content2 active:bg-content2',
        isDanger ? 'text-danger' : '',
        isPending ? 'opacity-60' : '',
      ].join(' ')}
      isDisabled={isPending}
      onPress={onSelect}
      variant={isDanger ? 'danger' : 'ghost'}
    >
      {children}
    </Button>
  );
}

function DeleteWorkoutDialog({
  exerciseCount,
  isDeleting,
  onCancel,
  onConfirm,
  workoutName,
}: {
  exerciseCount: number;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  workoutName: string;
}) {
  return (
    <AlertDialog
      defaultOpen
      onOpenChange={(open) => {
        if (!open && !isDeleting) onCancel();
      }}
    >
      <span className="hidden" />
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
                This will permanently delete <strong>{workoutName}</strong> and all {exerciseCount} exercise
                {exerciseCount !== 1 ? 's' : ''}. This action cannot be undone.
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                onPress={onCancel}
                variant="tertiary"
              >
                Cancel
              </Button>
              <Button
                isPending={isDeleting}
                onPress={async () => {
                  await onConfirm();
                }}
                variant="danger"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
