/**
 * WorkoutCard — one accordion card for a training workout.
 *
 * Header: inline-rename (PATCH workout) + exercise count + chevron + delete menu.
 * Body (open only): one ExerciseRow per workout_element + "Add exercise" button.
 *
 * Width discipline: WorkoutCard adds no horizontal padding inside the body —
 * ExerciseRow already owns its own 10px indent + 2px accent rule.
 */
import {Button, Dropdown, Label, Separator, Typography} from '@heroui/react';
import {ChevronDown, ChevronRight, MoreHorizontal, TrashIcon} from 'lucide-react';
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkoutCardProps {
  workout: TrainingPlanWorkout;
  open: boolean;
  onToggle: () => void;
  planId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkoutCard({workout, open, onToggle, planId}: WorkoutCardProps) {
  const dispatch = useAppDispatch();
  const [updateWorkout] = useUpdateWorkoutMutation();
  const [deleteWorkout] = useDeleteWorkoutMutation();
  const [createWorkoutElement] = useCreateWorkoutElementMutation();
  const [deleteWorkoutElement] = useDeleteWorkoutElementMutation();
  const [reorderWorkoutElements] = useReorderWorkoutElementsMutation();

  // Inline rename state
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(workout.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Keep local name in sync if the server value changes (e.g. refetch)
  useEffect(() => {
    if (!editingName) {
      setNameValue(workout.name);
    }
  }, [workout.name, editingName]);

  // Exercise picker sheet — anchor the desktop popover to the "+ Add exercise" button
  const [pickerOpen, setPickerOpen] = useState(false);
  const addExerciseButtonRef = useRef<HTMLButtonElement | null>(null);

  // ---------------------------------------------------------------------------
  // Rename handlers
  // ---------------------------------------------------------------------------

  const startEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // don't toggle accordion
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }, []);

  const commitRename = useCallback(async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === workout.name) {
      setEditingName(false);
      setNameValue(workout.name);
      return;
    }
    setEditingName(false);
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
  }, [nameValue, workout.id, workout.name, planId, updateWorkout, dispatch]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        commitRename().catch(() => undefined);
      } else if (e.key === 'Escape') {
        setEditingName(false);
        setNameValue(workout.name);
      }
    },
    [commitRename, workout.name],
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
    // the schedule cache, or the day rows keep pointing at a workout that no
    // longer exists (ghost assignments in the week schedule).
    const schedulePatch = dispatch(
      coachApi.util.updateQueryData('getTrainingPlanSchedule', {planId}, (draft) => {
        for (const [day, entry] of Object.entries(draft.data ?? {})) {
          if (entry?.training_workout_id === workout.id) {
            draft.data[day] = {...entry, training_workout_id: null, workout_name: null};
          }
        }
      }),
    );
    try {
      await deleteWorkout({id: workout.id}).unwrap();
    } catch (e) {
      patch.undo();
      schedulePatch.undo();
      toastMutationError(e, "Couldn't delete workout");
    }
  }, [workout.id, planId, deleteWorkout, dispatch]);

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
  // Derived
  // ---------------------------------------------------------------------------

  const exerciseCount = workout.workout_elements.length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header — acts as accordion toggle */}
      <div
        aria-expanded={open}
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
        onClick={editingName ? undefined : onToggle}
        onKeyDown={(e) => {
          if (!editingName && (e.key === 'Enter' || e.key === ' ')) {
            onToggle();
          }
        }}
        role="button"
        tabIndex={0}
      >
        {/* Chevron */}
        <span className="shrink-0 text-muted">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>

        {/* Name — inline-edit or plain text */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              ref={nameInputRef}
              // biome-ignore lint/a11y/noAutofocus: name field opens in editing mode on user intent
              autoFocus
              className="w-full bg-transparent text-sm font-semibold text-foreground outline-none border-b border-accent"
              onBlur={() => {
                commitRename().catch(() => undefined);
              }}
              onChange={(e) => setNameValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleNameKeyDown}
              value={nameValue}
            />
          ) : (
            // biome-ignore lint/a11y/noNoninteractiveElementInteractions: double-click to rename is a progressive enhancement on a display label; primary rename is in the dropdown menu
            // biome-ignore lint/a11y/noStaticElementInteractions: same as above
            <span
              className="text-sm font-semibold text-foreground truncate block"
              onDoubleClick={startEditing}
              title="Double-click to rename"
            >
              {workout.name}
            </span>
          )}
        </div>

        {/* Exercise count badge */}
        <span className="shrink-0 text-xs text-muted">
          {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
        </span>

        {/* Workout options menu — stop propagation so clicks don't toggle the accordion */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: stop-propagation wrapper around an interactive dropdown; role is on the Button inside */}
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: same as above */}
        <div
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Dropdown>
            <Button
              aria-label="Workout options"
              className="h-9 w-9 min-w-9"
              isIconOnly
              size="sm"
              variant="ghost"
            >
              <MoreHorizontal size={15} />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu
                onAction={(key) => {
                  // Route through onAction so it fires on pointer AND keyboard
                  // (RAC sends Enter/Space through onAction, not item onPress).
                  if (key === 'rename-workout') {
                    setEditingName(true);
                    setTimeout(() => nameInputRef.current?.select(), 0);
                    if (!open) {
                      onToggle();
                    }
                  } else if (key === 'delete-workout') {
                    handleDelete().catch(() => undefined);
                  }
                }}
              >
                <Dropdown.Section>
                  <Dropdown.Item
                    id="rename-workout"
                    textValue="Rename"
                  >
                    <Label>Rename</Label>
                  </Dropdown.Item>
                </Dropdown.Section>
                <Separator />
                <Dropdown.Section>
                  <Dropdown.Item
                    id="delete-workout"
                    textValue="Delete"
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
        </div>
      </div>

      {/* Body — exercises + add button */}
      {open ? (
        <div className="border-t border-border pb-3 pt-1">
          {exerciseCount === 0 ? (
            <Typography
              className="pl-2.5"
              color="muted"
              type="body-sm"
            >
              Add exercises
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

          <div className="pl-2.5">
            <button
              ref={addExerciseButtonRef}
              className="mt-3 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
              onClick={() => setPickerOpen(true)}
              type="button"
            >
              + Add exercise
            </button>
          </div>
        </div>
      ) : null}

      {/* Exercise picker sheet */}
      <ExercisePickerSheet
        anchorEl={addExerciseButtonRef.current}
        onAdd={(exercises) => {
          handleAddExercises(exercises).catch(() => undefined);
        }}
        onClose={() => setPickerOpen(false)}
        open={pickerOpen}
      />
    </div>
  );
}
