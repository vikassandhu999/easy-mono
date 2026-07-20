/**
 * WorkoutCard — the active workout of the training plan builder (badge TB).
 *
 * Card header: workout name (inline rename) · weekday chips (WeekSchedule) · ⋯
 * menu (Rename / Delete), then the `Scheduled: Mon, Thu` label. Body: one
 * ExerciseRow per workout_element, then `Add exercise`.
 *
 * Only the active workout renders — the tabs above (workout-list.tsx) pick it,
 * so this is a plain card rather than an accordion.
 *
 * Cache: tag:false — every mutation optimistically patches `listWorkouts`
 * (and `getTrainingPlanSchedule` on delete, which the backend cascades) and
 * rolls back with patch.undo() + toast on failure.
 */
import {AlertDialog, Button, Dropdown, Label, Separator, Spinner, Typography, useOverlayState} from '@heroui/react';
import {MoreHorizontal, Plus, TrashIcon} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';

import {toastMutationError} from '@/@components/mutation-toast';
import type {TrainingExercise, TrainingPlanWorkout} from '@/api/generated';
import {
  coachApi,
  useCreateWorkoutElementMutation,
  useDeleteWorkoutElementMutation,
  useDeleteWorkoutMutation,
  useReorderWorkoutElementsMutation,
  useUpdateWorkoutMutation,
} from '@/api/generated';
import {useAppDispatch} from '@/store';

import {ExercisePickerSheet} from './exercise-picker-sheet';
import {ExerciseRow} from './exercise-row';
import {ScheduleLabel, WeekSchedule} from './week-schedule';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkoutCardProps {
  workout: TrainingPlanWorkout;
  planId: string;
  /** Newly created workouts open straight into rename mode (INTERACTIONS.md § TB). */
  autoRename?: boolean;
  onRenamed?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkoutCard({workout, planId, autoRename, onRenamed}: WorkoutCardProps) {
  const dispatch = useAppDispatch();
  const [updateWorkout] = useUpdateWorkoutMutation();
  const [deleteWorkout, {isLoading: isDeleting}] = useDeleteWorkoutMutation();
  const [createWorkoutElement] = useCreateWorkoutElementMutation();
  const [deleteWorkoutElement] = useDeleteWorkoutElementMutation();
  const [reorderWorkoutElements] = useReorderWorkoutElementsMutation();

  // Inline rename state
  const [editingName, setEditingName] = useState(Boolean(autoRename));
  const [nameValue, setNameValue] = useState(workout.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Keep local name in sync if the server value changes (e.g. refetch)
  useEffect(() => {
    if (!editingName) {
      setNameValue(workout.name);
    }
  }, [workout.name, editingName]);

  const deleteAlertState = useOverlayState();

  // Exercise picker sheet — anchor the desktop popover to the "Add exercise" button
  const [pickerOpen, setPickerOpen] = useState(false);
  const addExerciseButtonRef = useRef<HTMLButtonElement | null>(null);

  // ---------------------------------------------------------------------------
  // Rename
  // ---------------------------------------------------------------------------

  const startEditing = useCallback(() => {
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }, []);

  const commitRename = useCallback(async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === workout.name) {
      setEditingName(false);
      setNameValue(workout.name);
      onRenamed?.();
      return;
    }
    setEditingName(false);
    onRenamed?.();
    const patch = dispatch(
      coachApi.util.updateQueryData('listWorkouts', {planId, limit: 100}, (draft) => {
        const w = draft.data.find((x) => x.id === workout.id);
        if (w) {
          w.name = trimmed;
        }
      }),
    );
    try {
      await updateWorkout({
        id: workout.id,
        trainingWorkoutUpdateRequest: {name: trimmed},
      }).unwrap();
    } catch (e) {
      patch.undo();
      setNameValue(workout.name);
      toastMutationError(e, "Couldn't save changes");
    }
  }, [nameValue, workout.id, workout.name, planId, updateWorkout, dispatch, onRenamed]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        commitRename().catch(() => undefined);
      } else if (e.key === 'Escape') {
        setEditingName(false);
        setNameValue(workout.name);
        onRenamed?.();
      }
    },
    [commitRename, workout.name, onRenamed],
  );

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const handleDelete = useCallback(async () => {
    const patch = dispatch(
      coachApi.util.updateQueryData('listWorkouts', {planId, limit: 100}, (draft) => {
        const idx = draft.data.findIndex((x) => x.id === workout.id);
        if (idx !== -1) {
          draft.data.splice(idx, 1);
        }
      }),
    );
    // The backend cascades schedule entries with the workout — mirror that in
    // the schedule cache, or the weekday chips keep pointing at a workout that
    // no longer exists (INTERACTIONS.md § TB: delete clears the schedule).
    const schedulePatch = dispatch(
      coachApi.util.updateQueryData('getTrainingPlanSchedule', {planId}, (draft) => {
        if (!draft.data) {
          return;
        }
        for (const [day, entry] of Object.entries(draft.data)) {
          if (entry?.training_workout_id === workout.id) {
            draft.data[day] = {...entry, training_workout_id: null, workout_name: null};
          }
        }
      }),
    );
    try {
      await deleteWorkout({id: workout.id}).unwrap();
      deleteAlertState.close();
    } catch (e) {
      patch.undo();
      schedulePatch.undo();
      deleteAlertState.close();
      toastMutationError(e, "Couldn't delete workout");
    }
  }, [workout.id, planId, deleteWorkout, dispatch, deleteAlertState]);

  // ---------------------------------------------------------------------------
  // Add exercises (from picker)
  // ---------------------------------------------------------------------------

  const handleAddExercises = useCallback(
    async (exercises: TrainingExercise[]) => {
      // Create one workout element per selected exercise (default 1 working set)
      for (const exercise of exercises) {
        try {
          const result = await createWorkoutElement({
            workoutId: workout.id,
            trainingWorkoutExerciseRequest: {
              exercise_id: exercise.id,
              planned_sets: [
                {
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
                },
              ],
            },
          }).unwrap();
          // Append the new element into the cache immediately
          const newElement = result.data;
          dispatch(
            coachApi.util.updateQueryData('listWorkouts', {planId, limit: 100}, (draft) => {
              const w = draft.data.find((x) => x.id === workout.id);
              if (w) {
                w.workout_elements = [...w.workout_elements, newElement];
              }
            }),
          );
        } catch (e) {
          toastMutationError(e, "Couldn't add exercise");
        }
      }
    },
    [workout.id, planId, createWorkoutElement, dispatch],
  );

  // ---------------------------------------------------------------------------
  // Remove / reorder exercises
  // ---------------------------------------------------------------------------

  const handleRemoveExercise = useCallback(
    async (elementId: string) => {
      const patch = dispatch(
        coachApi.util.updateQueryData('listWorkouts', {planId, limit: 100}, (draft) => {
          const w = draft.data.find((x) => x.id === workout.id);
          if (w) {
            w.workout_elements = w.workout_elements.filter((e) => e.id !== elementId);
          }
        }),
      );
      try {
        await deleteWorkoutElement({id: elementId}).unwrap();
      } catch (e) {
        patch.undo();
        toastMutationError(e, "Couldn't remove exercise");
      }
    },
    [workout.id, planId, deleteWorkoutElement, dispatch],
  );

  const handleMoveExercise = useCallback(
    async (index: number, direction: -1 | 1) => {
      const elements = workout.workout_elements;
      const target = index + direction;
      const movedId = elements[index]?.id;
      if (target < 0 || target >= elements.length || movedId === undefined) {
        return;
      }
      // Move the element to its new adjacent slot; the resulting id order is the
      // new exercise order.
      const elementIds = elements.map((e) => e.id);
      elementIds.splice(index, 1);
      elementIds.splice(target, 0, movedId);

      const patch = dispatch(
        coachApi.util.updateQueryData('listWorkouts', {planId, limit: 100}, (draft) => {
          const w = draft.data.find((x) => x.id === workout.id);
          if (!w) {
            return;
          }
          const byId = new Map(w.workout_elements.map((e) => [e.id, e]));
          w.workout_elements = elementIds.flatMap((id, i) => {
            const el = byId.get(id);
            return el ? [{...el, position: i}] : [];
          });
        }),
      );
      try {
        await reorderWorkoutElements({
          workoutId: workout.id,
          trainingWorkoutReorderRequest: {element_ids: elementIds},
        }).unwrap();
      } catch (e) {
        patch.undo();
        toastMutationError(e, "Couldn't reorder exercises");
      }
    },
    [workout.id, workout.workout_elements, planId, reorderWorkoutElements, dispatch],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const exerciseCount = workout.workout_elements.length;

  // Rename / Delete — rendered next to the name below `sm` and next to the
  // weekday chips above it, so it never competes with the chips for width.
  const workoutMenu = (
    <Dropdown>
      <Button
        aria-label={`Workout options for ${workout.name}`}
        className="size-11 min-w-11 shrink-0 text-muted"
        isIconOnly
        variant="ghost"
      >
        <MoreHorizontal className="size-4" />
      </Button>
      <Dropdown.Popover>
        {/* Drive selection via the menu so it fires on pointer AND keyboard
            activation — RAC routes Enter/Space through onAction, not the
            item's onPress. */}
        <Dropdown.Menu
          onAction={(key) => {
            if (key === 'rename-workout') {
              startEditing();
            } else if (key === 'delete-workout') {
              deleteAlertState.open();
            }
          }}
        >
          <Dropdown.Section>
            <Dropdown.Item
              id="rename-workout"
              textValue="Rename workout"
            >
              <Label>Rename workout</Label>
            </Dropdown.Item>
          </Dropdown.Section>
          <Separator />
          <Dropdown.Section>
            <Dropdown.Item
              id="delete-workout"
              textValue="Delete workout"
              variant="danger"
            >
              <div className="flex items-center gap-2">
                <TrashIcon className="size-4 shrink-0 text-danger" />
                <Label>Delete workout</Label>
              </div>
            </Dropdown.Item>
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      {/* Header — name + weekday chips + ⋯ */}
      <div className="flex flex-col gap-2 px-4 pt-3 pb-3">
        {/* Below sm the chips take their own scrolling row: seven 44px targets
            don't fit beside the name at 390px, and wrapping them mid-week reads
            as two broken weeks. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:flex-1">
            {editingName ? (
              <input
                ref={nameInputRef}
                // biome-ignore lint/a11y/noAutofocus: name field opens in editing mode on user intent
                autoFocus
                aria-label="Workout name"
                className="min-w-0 flex-1 border-b border-accent bg-transparent text-base font-semibold text-foreground outline-none"
                onBlur={() => {
                  commitRename().catch(() => undefined);
                }}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={handleNameKeyDown}
                value={nameValue}
              />
            ) : (
              <Typography
                className="min-w-0 flex-1 truncate"
                type="h4"
                weight="semibold"
              >
                {workout.name}
              </Typography>
            )}

            <div className="shrink-0 sm:hidden">{workoutMenu}</div>
          </div>

          <div className="flex min-w-0 items-center gap-1.5">
            <div className="-mx-1 min-w-0 overflow-x-auto px-1 py-0.5">
              <WeekSchedule
                planId={planId}
                workoutId={workout.id}
                workoutName={workout.name}
              />
            </div>

            <div className="hidden shrink-0 sm:block">{workoutMenu}</div>
          </div>
        </div>

        <ScheduleLabel
          planId={planId}
          workoutId={workout.id}
        />
      </div>

      {/* Body — exercises + add */}
      <div className="border-t border-border px-4 pt-2 pb-4">
        {exerciseCount === 0 ? (
          <Typography
            className="py-2"
            color="muted"
            type="body-sm"
          >
            No exercises yet — add the first one below.
          </Typography>
        ) : (
          workout.workout_elements.map((element, index) => (
            <ExerciseRow
              key={element.id}
              index={index}
              isFirst={index === 0}
              isLast={index === workout.workout_elements.length - 1}
              onMove={handleMoveExercise}
              onRemove={() => {
                handleRemoveExercise(element.id).catch(() => undefined);
              }}
              planId={planId}
              workoutExercise={element}
            />
          ))
        )}

        <Button
          className="mt-3 w-full rounded-control border border-dashed border-border text-accent"
          onPress={() => setPickerOpen(true)}
          ref={addExerciseButtonRef}
          variant="ghost"
        >
          <Plus className="size-4" />
          Add exercise
        </Button>
      </div>

      {/* Exercise picker sheet */}
      <ExercisePickerSheet
        anchorEl={addExerciseButtonRef.current}
        onAdd={(exercises) => {
          handleAddExercises(exercises).catch(() => undefined);
        }}
        onClose={() => setPickerOpen(false)}
        open={pickerOpen}
      />

      {/* Delete workout confirm */}
      <AlertDialog.Backdrop
        isDismissable={!isDeleting}
        isOpen={deleteAlertState.isOpen}
        onOpenChange={deleteAlertState.setOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-100">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete "{workout.name}"?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>Its exercises go with it, and it comes off the weekly schedule.</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={isDeleting}
                slot="close"
                variant="tertiary"
              >
                Cancel
              </Button>
              <Button
                className="relative"
                isPending={isDeleting}
                onPress={() => {
                  handleDelete().catch(() => undefined);
                }}
                variant="danger"
              >
                <span className={isDeleting ? 'invisible' : undefined}>Delete</span>
                {isDeleting ? (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Spinner
                      color="current"
                      size="sm"
                    />
                    <span className="sr-only">Deleting</span>
                  </span>
                ) : null}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </div>
  );
}
