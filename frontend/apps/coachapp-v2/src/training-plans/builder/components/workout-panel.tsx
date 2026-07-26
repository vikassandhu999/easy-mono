/**
 * The active workout card (badge TB): header · schedule line · exercises ·
 * `+ Add exercise`.
 *
 * Only the selected workout renders — the tabs above pick it — so this is a
 * plain card rather than an accordion.
 *
 * `actions` is the command layer already bound to THIS workout, so nothing here
 * passes a workout id around or can reach another workout. The leaves below
 * stay strictly props-in/callbacks-out.
 */
import {AlertDialog, Button, Spinner, Typography, useOverlayState} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useRef, useState} from 'react';

import type {TrainingPlanWorkout} from '@/api/generated';

import {type Day, scheduleLabel} from '../schedule';
import type {WorkoutActions} from '../use-plan-builder';
import {ExerciseItem} from './exercise-item';
import {ExercisePicker} from './exercise-picker';
import {WorkoutHeader} from './workout-header';

interface WorkoutPanelProps {
  workout: TrainingPlanWorkout;
  scheduledDays: Day[];
  autoRename: boolean;
  onRenameSettled: () => void;
  onOpenSet: (elementId: string, setIndex: number, anchor: HTMLElement) => void;
  actions: WorkoutActions;
}

export function WorkoutPanel({
  workout,
  scheduledDays,
  autoRename,
  onRenameSettled,
  onOpenSet,
  actions,
}: WorkoutPanelProps) {
  const deleteAlert = useOverlayState();
  const [isPickerOpen, setPickerOpen] = useState(false);
  const pickerAnchor = useRef<HTMLElement | null>(null);
  const elements = workout.workout_elements;

  return (
    <div
      className="relative rounded-card border border-border bg-surface"
      data-testid="tb-card"
    >
      <WorkoutHeader
        autoRename={autoRename}
        name={workout.name}
        onDelete={deleteAlert.open}
        onRename={actions.rename}
        onRenameSettled={onRenameSettled}
        onToggleDay={actions.toggleDay}
        scheduledDays={scheduledDays}
      />

      <div
        className="flex flex-col px-4 pb-3 [row-gap:normal] [column-gap:normal]"
        data-testid="tb-sched-row"
      >
        <span
          className="font-count type-eyebrow font-semibold text-muted"
          data-testid="tb-sched-label"
        >
          {scheduleLabel(scheduledDays)}
        </span>

        {/* A workout used on more than one weekday is edited in one place
            (INTERACTIONS.md § TB). The days are already on the line above, so
            the note carries only the consequence. */}
        {scheduledDays.length > 1 ? (
          <Typography
            className="mt-0.5 text-muted-2"
            type="body-xs"
          >
            Edits apply to all of them.
          </Typography>
        ) : null}
      </div>

      <div
        className="flex flex-col border-t border-border px-4 pt-1.5 pb-2"
        data-testid="tb-exercises"
      >
        {elements.length === 0 ? (
          <div
            className="py-5 text-center type-eyebrow text-muted"
            data-testid="tb-empty"
          >
            No exercises yet — add the first one below.
          </div>
        ) : (
          elements.map((element, index) => (
            <ExerciseItem
              key={element.id}
              element={element}
              isFirst={index === 0}
              isLast={index === elements.length - 1}
              onAddSet={(anchor) => {
                actions.addSet(element.id);
                onOpenSet(element.id, element.planned_sets.length, anchor);
              }}
              onMove={(direction) => actions.moveExercise(index, index + direction)}
              onOpenSet={(setIndex, anchor) => onOpenSet(element.id, setIndex, anchor)}
              onRemove={() => actions.removeExercise(element.id)}
              onRemoveSet={(setIndex) => actions.removeSet(element.id, setIndex)}
            />
          ))
        )}
      </div>

      <div
        className="px-4 py-3"
        data-testid="tb-add-exercise-row"
      >
        <Button
          className="gap-1.5 rounded-none bg-transparent px-0 font-btn type-body font-semibold leading-[normal] text-accent"
          data-testid="tb-add-exercise"
          onPress={(event) => {
            pickerAnchor.current = event.target as HTMLElement;
            setPickerOpen(true);
          }}
          variant="ghost"
        >
          <Plus />
          Add exercise
        </Button>
      </div>

      <ExercisePicker
        anchorEl={pickerAnchor.current}
        isOpen={isPickerOpen}
        onAdd={actions.addExercises}
        onClose={() => setPickerOpen(false)}
      />

      <AlertDialog.Backdrop
        isDismissable={!actions.isRemoving}
        isOpen={deleteAlert.isOpen}
        onOpenChange={deleteAlert.setOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete "{workout.name}"?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>Its exercises go with it, and it comes off the weekly schedule.</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={actions.isRemoving}
                slot="close"
                variant="tertiary"
              >
                Cancel
              </Button>
              <Button
                className="relative"
                isPending={actions.isRemoving}
                onPress={() => {
                  actions
                    .remove()
                    .then(deleteAlert.close)
                    .catch(() => undefined);
                }}
                variant="danger"
              >
                <span className={actions.isRemoving ? 'invisible' : undefined}>Delete</span>
                {actions.isRemoving ? (
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
